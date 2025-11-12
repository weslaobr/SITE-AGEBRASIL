// lib/database.ts - VERSÃO OTIMIZADA SEM AVATARS
import { Pool } from 'pg';

export interface Player {
  rank: number;
  name: string;
  profile_url: string;
  global_rank: number;
  season_rank_global: number;
  rank_level: string;
  points: number;
  elo: number;
  win_rate: number;
  wins: number;
  losses: number;
  total_matches: number;
  last_game: string;
  last_game_timestamp?: number;
  id: number;
  discord_user_id: string;
  aoe4_world_id: string;
  mode?: 'solo' | 'team';
  season?: number;
  // ❌ REMOVIDO: avatar_url
}

export interface Clan {
  id: number;
  name: string;
  tag: string;
  leader_id: number;
  description?: string;
  total_members: number;
  average_elo: number;
  total_points: number;
  active_players: number;
  rank: number;
}

export interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

class Database {
  private pool: Pool;

  constructor() {
    console.log('🔌 Iniciando conexão com PostgreSQL...');
    
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/agebrasil';
    
    this.pool = new Pool({
      connectionString: connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    this.testConnection();
  }

  private async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('✅ Conectado ao PostgreSQL com sucesso!');
      client.release();
    } catch (error) {
      console.error('❌ Erro ao conectar com PostgreSQL:', error);
      console.log('📝 Usando dados mockados temporariamente...');
    }
  }

  // ==================== PLAYERS METHODS ====================

  async getStats(season?: string, mode?: string) {
    try {
      const players = await this.getPlayers(season, mode);
      
      const totalPlayers = players.length;
      const totalWins = players.reduce((sum, player) => sum + player.wins, 0);
      const totalMatches = players.reduce((sum, player) => sum + player.total_matches, 0);
      const highestPoints = players.length > 0 ? Math.max(...players.map(p => p.points)) : 0;
      const totalExperts = players.filter(player => player.points >= 1400).length;

      console.log('📊 ESTATÍSTICAS CALCULADAS:', {
        totalPlayers,
        totalWins, 
        totalMatches,
        highestPoints,
        totalExperts
      });

      return {
        totalPlayers,
        totalWins,
        totalMatches,
        highestPoints,
        totalExperts,
        filters: { season, mode }
      };
    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      
      return {
        totalPlayers: 2,
        totalWins: 246,
        totalMatches: 400,
        highestPoints: 1450,
        totalExperts: 1,
        filters: { season, mode }
      };
    }
  }

  async getPlayers(season?: string, mode?: string): Promise<Player[]> {
    try {
      console.log(`\n🎯 DATABASE - Buscando players: season=${season}, mode=${mode}`);
      
      const query = `
        SELECT 
          id,
          discord_user_id,
          aoe4_world_id,
          last_game_checkup_at
        FROM users 
        WHERE aoe4_world_id IS NOT NULL 
        AND aoe4_world_id != ''
        ORDER BY id
      `;

      const result = await this.pool.query(query);
      const rows = result.rows;

      console.log(`✅ ${rows.length} usuários encontrados no PostgreSQL`);
      
      if (rows.length === 0) {
        console.log('ℹ️  Nenhum usuário encontrado - usando dados mockados');
        return this.getMockPlayers();
      }

      const players: Player[] = [];
      const modoRequisitado = mode || 'solo';

      for (const user of rows) {
        try {
          const aoe4Data = await this.getAOE4WorldData(user.aoe4_world_id, modoRequisitado);
          
          if (aoe4Data) {
            const player: Player = {
              rank: 0,
              name: aoe4Data.name,
              profile_url: aoe4Data.profile_url,
              global_rank: aoe4Data.season_rank_global || 0,
              season_rank_global: aoe4Data.season_rank_global || 0,
              rank_level: aoe4Data.points > 0 ? this.getRankLevel(aoe4Data.points) : 'Sem rank',
              points: aoe4Data.points,
              elo: aoe4Data.elo,
              win_rate: aoe4Data.win_rate,
              wins: aoe4Data.wins,
              losses: aoe4Data.losses,
              total_matches: aoe4Data.total_matches,
              last_game: aoe4Data.last_game,
              last_game_timestamp: aoe4Data.last_game_timestamp,
              id: user.id,
              discord_user_id: user.discord_user_id,
              aoe4_world_id: user.aoe4_world_id,
              mode: modoRequisitado as 'solo' | 'team',
              season: season ? parseInt(season) : undefined,
              // ❌ REMOVIDO: avatar_url
            };
            
            players.push(player);
          }
        } catch (error) {
          console.log(`❌ Erro no usuário ${user.discord_user_id}:`, error);
        }
      }

      // Ordena por pontos
      const playersComPontos = players.filter(p => p.points > 0);
      playersComPontos.sort((a, b) => b.points - a.points);
      playersComPontos.forEach((player, index) => {
        player.rank = index + 1;
      });

      console.log(`📊 RESUMO: ${playersComPontos.length} jogadores com ranking`);
      return [...playersComPontos, ...players.filter(p => p.points === 0)];

    } catch (error) {
      console.error('❌ Erro no getPlayers:', error);
      return this.getMockPlayers();
    }
  }

  // ==================== CLANS METHODS ====================

  async getClans(season?: string): Promise<Clan[]> {
    try {
      console.log(`\n🏴 DATABASE - Buscando clans: Season=${season || 'current'}`);
      
      const query = `
        SELECT 
          c.id,
          c.name,
          c.tag,
          c.owner_id as leader_id,
          c.description,
          CAST(COUNT(DISTINCT cm.discord_user_id) AS INTEGER) as total_members
        FROM clans c
        LEFT JOIN clan_members cm ON c.id = cm.clan_id
        GROUP BY c.id, c.name, c.tag, c.owner_id, c.description
        ORDER BY total_members DESC, c.name ASC
      `;

      const result = await this.pool.query(query);
      const rows = result.rows;

      console.log(`✅ ${rows.length} clans encontrados no PostgreSQL`);
      
      const enrichedClans: Clan[] = [];
      
      for (const clan of rows) {
        const totalMembers = Number(clan.total_members) || 0;
        
        console.log(`📊 Processando clan: ${clan.name} (ID: ${clan.id})`);

        const clanStats = await this.getClanStats(clan.id);
        
        console.log(`   - Stats: ${clanStats.active_players} ativos, ${clanStats.total_points} pontos`);
        
        enrichedClans.push({
          id: clan.id,
          name: clan.name,
          tag: clan.tag,
          leader_id: clan.leader_id,
          description: clan.description || 'Sem descrição',
          total_members: totalMembers,
          average_elo: clanStats.average_elo,
          total_points: clanStats.total_points,
          active_players: clanStats.active_players,
          rank: 0
        });
      }
      
      // Aplicar ranking
      enrichedClans.sort((a, b) => b.total_points - a.total_points);
      enrichedClans.forEach((clan, index) => {
        clan.rank = index + 1;
      });

      console.log('\n📈 RESUMO FINAL DOS CLANS:');
      enrichedClans.forEach(clan => {
        console.log(`   ${clan.rank}. ${clan.name}: ${clan.total_members} membros, ${clan.active_players} ativos, ${clan.total_points} pontos`);
      });
      
      return enrichedClans;

    } catch (error) {
      console.error('❌ Erro ao buscar clans:', error);
      return this.getMockClans();
    }
  }

  // ==================== CLAN SPECIFIC METHODS ====================

  async getClanById(clanId: number): Promise<Clan | null> {
    try {
      console.log(`🔍 Buscando clan por ID: ${clanId}`);
      
      const query = `
        SELECT 
          c.id,
          c.name,
          c.tag,
          c.owner_id as leader_id,
          c.description,
          CAST(COUNT(cm.discord_user_id) AS INTEGER) as total_members
        FROM clans c
        LEFT JOIN clan_members cm ON c.id = cm.clan_id
        WHERE c.id = $1
        GROUP BY c.id, c.name, c.tag, c.owner_id, c.description
      `;

      const result = await this.pool.query(query, [clanId]);
      
      if (result.rows.length === 0) {
        console.log(`❌ Clan ${clanId} não encontrado`);
        return null;
      }

      const clan = result.rows[0];
      const clanStats = await this.getClanStats(clanId);
      
      return {
        id: clan.id,
        name: clan.name,
        tag: clan.tag,
        leader_id: clan.leader_id,
        description: clan.description || 'Sem descrição',
        total_members: Number(clan.total_members) || 0,
        average_elo: clanStats.average_elo,
        total_points: clanStats.total_points,
        active_players: clanStats.active_players,
        rank: 0
      };

    } catch (error) {
      console.error(`❌ Erro ao buscar clan ${clanId}:`, error);
      return null;
    }
  }

  async getClanMembers(clanId: number): Promise<Player[]> {
    try {
      console.log(`👥 Buscando membros do clan: ${clanId}`);
      
      const query = `
        SELECT u.discord_user_id, u.aoe4_world_id, u.id as user_id
        FROM clan_members cm
        INNER JOIN users u ON cm.discord_user_id = u.discord_user_id
        WHERE cm.clan_id = $1 AND u.aoe4_world_id IS NOT NULL
      `;

      const result = await this.pool.query(query, [clanId]);
      const members: Player[] = [];

      console.log(`✅ ${result.rows.length} membros encontrados no clan ${clanId}`);

      // Buscar dados de cada membro
      for (const member of result.rows) {
        try {
          const playerData = await this.getAOE4WorldData(member.aoe4_world_id, 'solo');
          
          if (playerData) {
            const player: Player = {
              rank: 0,
              name: playerData.name,
              profile_url: playerData.profile_url,
              global_rank: playerData.season_rank_global || 0,
              season_rank_global: playerData.season_rank_global || 0,
              rank_level: playerData.points > 0 ? this.getRankLevel(playerData.points) : 'Sem rank',
              points: playerData.points,
              elo: playerData.elo,
              win_rate: playerData.win_rate,
              wins: playerData.wins,
              losses: playerData.losses,
              total_matches: playerData.total_matches,
              last_game: playerData.last_game,
              last_game_timestamp: playerData.last_game_timestamp,
              id: member.user_id || 0,
              discord_user_id: member.discord_user_id,
              aoe4_world_id: member.aoe4_world_id,
              mode: 'solo',
              // ❌ REMOVIDO: avatar_url
            };
            
            members.push(player);
          }
        } catch (error) {
          console.log(`⚠️ Erro ao buscar dados do membro ${member.discord_user_id}:`, error);
        }
      }

      // Ordenar por pontos
      members.sort((a, b) => b.points - a.points);
      members.forEach((player, index) => {
        player.rank = index + 1;
      });

      return members;

    } catch (error) {
      console.error(`❌ Erro ao buscar membros do clan ${clanId}:`, error);
      return [];
    }
  }

  private async getClanStats(clanId: number): Promise<{average_elo: number, total_points: number, active_players: number}> {
    try {
      const membersResult = await this.pool.query(
        'SELECT discord_user_id FROM clan_members WHERE clan_id = $1',
        [clanId]
      );
      
      if (membersResult.rows.length === 0) {
        return { average_elo: 0, total_points: 0, active_players: 0 };
      }
      
      const memberIds = membersResult.rows.map(m => m.discord_user_id);
      const placeholders = memberIds.map((_, i) => `$${i + 1}`).join(',');
      
      const usersResult = await this.pool.query(
        `SELECT discord_user_id, aoe4_world_id FROM users WHERE discord_user_id IN (${placeholders}) AND aoe4_world_id IS NOT NULL`,
        memberIds
      );
      
      let totalElo = 0;
      let totalPoints = 0;
      let activePlayers = 0;
      
      const playerPromises = usersResult.rows.map(async (user) => {
        try {
          const playerData = await this.getAOE4WorldData(user.aoe4_world_id, 'solo');
          if (playerData && playerData.elo > 0 && playerData.points > 0) {
            return {
              elo: playerData.elo,
              points: playerData.points
            };
          }
        } catch (error) {
          // Ignora erros individuais
        }
        return null;
      });

      const playerResults = await Promise.all(playerPromises);
      
      playerResults.forEach(result => {
        if (result) {
          totalElo += result.elo;
          totalPoints += result.points;
          activePlayers++;
        }
      });
      
      const averageElo = activePlayers > 0 ? Math.round(totalElo / activePlayers) : 0;
      
      return {
        average_elo: averageElo,
        total_points: Math.round(totalPoints),
        active_players: activePlayers
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar stats do clan ${clanId}:`, error);
      return { average_elo: 0, total_points: 0, active_players: 0 };
    }
  }

  // ==================== MOCK DATA ====================

  private getMockPlayers(): Player[] {
    console.log('🎭 Usando dados mockados para desenvolvimento');
    
    return [
      {
        rank: 1,
        name: "Player Elite",
        profile_url: "https://aoe4world.com/players/elite123",
        global_rank: 850,
        season_rank_global: 850,
        rank_level: "Conquer 1",
        points: 1450,
        elo: 1450,
        win_rate: 65,
        wins: 130,
        losses: 70,
        total_matches: 200,
        last_game: "há 2 dias",
        last_game_timestamp: Date.now() - 172800000,
        id: 1,
        discord_user_id: "elite123",
        aoe4_world_id: "elite123",
        mode: 'solo',
        season: 12,
        // ❌ REMOVIDO: avatar_url
      },
      {
        rank: 2,
        name: "Player Diamond", 
        profile_url: "https://aoe4world.com/players/diamond456",
        global_rank: 2150,
        season_rank_global: 2150,
        rank_level: "Diamante 3",
        points: 1350,
        elo: 1350,
        win_rate: 58,
        wins: 116,
        losses: 84,
        total_matches: 200,
        last_game: "há 1 dia",
        last_game_timestamp: Date.now() - 86400000,
        id: 2,
        discord_user_id: "diamond456",
        aoe4_world_id: "diamond456",
        mode: 'solo',
        season: 12,
        // ❌ REMOVIDO: avatar_url
      },
      {
        rank: 3,
        name: "Player Platinum",
        profile_url: "https://aoe4world.com/players/plat789",
        global_rank: 3500,
        season_rank_global: 3500,
        rank_level: "Platina 2",
        points: 1150,
        elo: 1150,
        win_rate: 52,
        wins: 78,
        losses: 72,
        total_matches: 150,
        last_game: "há 3 dias",
        last_game_timestamp: Date.now() - 259200000,
        id: 3,
        discord_user_id: "plat789",
        aoe4_world_id: "plat789",
        mode: 'solo',
        season: 12,
        // ❌ REMOVIDO: avatar_url
      }
    ];
  }

  private getMockClans(): Clan[] {
    console.log('🎭 Usando clans mockados para desenvolvimento');
    
    return [
      {
        id: 1,
        name: "Brazilian Elite",
        tag: "BRZ",
        leader_id: 1,
        description: "Top clan brasileiro de Age of Empires IV",
        total_members: 11,
        average_elo: 1380,
        total_points: 15200,
        active_players: 9,
        rank: 1
      },
      {
        id: 2,
        name: "Latin Warriors", 
        tag: "LAT",
        leader_id: 2,
        description: "Clan latino-americano competitivo",
        total_members: 8,
        average_elo: 1280,
        total_points: 10240,
        active_players: 7,
        rank: 2
      },
      {
        id: 3,
        name: "Rising Stars",
        tag: "RISE",
        leader_id: 3,
        description: "Clan em desenvolvimento com novos talentos",
        total_members: 6,
        average_elo: 1180,
        total_points: 7080,
        active_players: 5,
        rank: 3
      }
    ];
  }

  // ==================== SEASONS METHOD ====================

  async getSeasons(): Promise<Season[]> {
    try {
      console.log('🌐 Buscando temporadas da API AOE4 World...');
      
      const response = await fetch('https://aoe4world.com/api/v0/seasons', {
        headers: {
          'User-Agent': 'AgeBrasil/1.0',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log(`❌ API respondeu com ${response.status}, tentando fallback...`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.seasons || data.seasons.length === 0) {
        console.log('⚠️  Nenhuma temporada encontrada na API');
        throw new Error('Nenhuma temporada encontrada');
      }

      const seasons: Season[] = data.seasons.map((season: any) => ({
        id: season.id,
        name: season.name || `Season ${season.id}`,
        start_date: season.started_at ? new Date(season.started_at).toISOString().split('T')[0] : 'N/A',
        end_date: season.ended_at ? new Date(season.ended_at).toISOString().split('T')[0] : 'Presente',
        is_current: season.ongoing || false
      }));

      seasons.sort((a, b) => b.id - a.id);

      console.log(`✅ ${seasons.length} temporadas carregadas da API`);
      return seasons;
      
    } catch (error) {
      console.error('❌ Erro ao buscar temporadas da API:', error);
      console.log('🔄 Usando temporadas locais...');
      
      return this.getLocalSeasons();
    }
  }

  private getLocalSeasons(): Season[] {
    return [
      {
        id: 13,
        name: 'Season 13',
        start_date: '2025-02-01',
        end_date: 'Presente',
        is_current: true
      },
      {
        id: 12,
        name: 'Season 12', 
        start_date: '2024-11-01',
        end_date: '2025-01-31',
        is_current: false
      },
      {
        id: 11,
        name: 'Season 11',
        start_date: '2024-08-01',
        end_date: '2024-10-31',
        is_current: false
      }
    ];
  }

  // ==================== AOE4 WORLD API METHODS ====================

  private async getAOE4WorldData(aoe4WorldId: string, mode?: string): Promise<any> {
    try {
      console.log(`🌐 Buscando dados do player ${aoe4WorldId} na AOE4 World API...`);
      
      const response = await fetch(`https://aoe4world.com/api/v0/players/${aoe4WorldId}`);
      
      if (!response.ok) {
        console.log(`❌ API retornou ${response.status} para ${aoe4WorldId}`);
        return this.createFallbackData(aoe4WorldId, undefined, mode, true);
      }
      
      const data = await response.json();
      
      console.log('🔍 Estrutura completa da resposta:', Object.keys(data));
      console.log(`✅ Dados recebidos para ${aoe4WorldId}:`, {
        name: data.name,
        has_images: !!data.images,
        images_keys: data.images ? Object.keys(data.images) : 'none'
      });

      // Encontra dados do modo solicitado
      const modeData = this.findAnyGameModeData(data, mode || 'solo');
      
      if (!modeData) {
        console.log(`⚠️  Sem dados de modo para ${aoe4WorldId}`);
        return this.createFallbackData(aoe4WorldId, data.name, mode, true);
      }
      
      const pointsValue = modeData.rating || 0;
      const eloValue = mode === 'solo' ? 
        (data.modes?.rm_1v1_elo?.rating || modeData.max_rating || pointsValue) :
        (modeData.max_rating || pointsValue);

      return {
        name: data.name || `Player_${aoe4WorldId}`,
        profile_url: `https://aoe4world.com/players/${aoe4WorldId}`,
        season_rank_global: modeData.rank || 0,
        points: pointsValue,
        elo: eloValue,
        wins: modeData.wins_count || 0,
        losses: modeData.losses_count || 0,
        win_rate: modeData.win_rate || 0,
        total_matches: (modeData.wins_count || 0) + (modeData.losses_count || 0),
        last_game: "há alguns dias",
        rank_level: pointsValue > 0 ? this.getRankLevel(pointsValue) : 'Unranked',
        // ❌ REMOVIDO: avatar_url
      };
      
    } catch (error) {
      console.error(`❌ Erro ao buscar dados do player ${aoe4WorldId}:`, error);
      return this.createFallbackData(aoe4WorldId, undefined, mode, true);
    }
  }

  private findAnyGameModeData(playerData: any, requestedMode: string) {
    if (!playerData.modes) return null;
    
    if (requestedMode === 'solo') {
      return playerData.modes.rm_solo || playerData.modes.rm_1v1 || 
             Object.values(playerData.modes).find((mode: any) => 
               mode.mode_type === 'solo' || mode.mode_type === '1v1'
             );
    }
    
    if (requestedMode === 'team') {
      return playerData.modes.rm_team || 
             Object.values(playerData.modes).find((mode: any) => 
               mode.mode_type?.includes('team') || /\d+v\d+/.test(mode.mode_type || '')
             );
    }
    
    return Object.values(playerData.modes)[0];
  }

  private createFallbackData(aoe4WorldId: string, playerName?: string, mode?: string, noData: boolean = false) {
    if (noData) {
      return {
        name: playerName || `Player_${aoe4WorldId}`,
        profile_url: `https://aoe4world.com/players/${aoe4WorldId}`,
        season_rank_global: 0,
        points: 0,
        elo: 0,
        wins: 0,
        losses: 0,
        win_rate: 0,
        total_matches: 0,
        last_game: "Nunca",
        rank_level: 'Unranked',
        // ❌ REMOVIDO: avatar_url
      };
    }
    
    const points = 1200 + Math.random() * 300;
    
    return {
      name: playerName || `Player_${aoe4WorldId}`,
      profile_url: `https://aoe4world.com/players/${aoe4WorldId}`,
      season_rank_global: 5000 + Math.floor(Math.random() * 50000),
      points: points,
      elo: points,
      wins: 10 + Math.floor(Math.random() * 20),
      losses: 5 + Math.floor(Math.random() * 15),
      win_rate: 50 + Math.floor(Math.random() * 30),
      total_matches: 15 + Math.floor(Math.random() * 30),
      last_game: "há " + (1 + Math.floor(Math.random() * 7)) + " dias",
      rank_level: this.getRankLevel(points),
      // ❌ REMOVIDO: avatar_url
    };
  }

  private getRankLevel(pointsOrElo: number): string {
    const value = pointsOrElo;
    
    if (value >= 1600) return 'Conquer 3';
    if (value >= 1500) return 'Conquer 2';
    if (value >= 1400) return 'Conquer 1';
    if (value >= 1350) return 'Diamante 3';
    if (value >= 1300) return 'Diamante 2';   
    if (value >= 1200) return 'Diamante 1';
    if (value >= 1150) return 'Platina 3';
    if (value >= 1100) return 'Platina 2';
    if (value >= 1000) return 'Platina 1';    
    if (value >= 900) return 'Ouro 3';
    if (value >= 800) return 'Ouro 2';
    if (value >= 700) return 'Ouro 1';
    if (value >= 600) return 'Prata 3';
    if (value >= 550) return 'Prata 2';    
    if (value >= 500) return 'Prata 1';
    if (value >= 450) return 'Bronze 3';
    if (value >= 400) return 'Bronze 2';
    return 'Bronze 1';
  }

  async close() {
    await this.pool.end();
  }
}

export const database = new Database();