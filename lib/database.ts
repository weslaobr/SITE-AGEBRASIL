// database.ts - VERSÃO CORRIGIDA E FUNCIONAL
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'database', 'agebrasil.db');

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
  private db: sqlite3.Database;

  constructor() {
    console.log('🔌 Conectando ao banco...');
    this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
  }

  // ==================== PLAYERS METHODS ====================

  async getPlayers(season?: string, mode?: string): Promise<Player[]> {
    return new Promise((resolve, reject) => {
      console.log(`\n🎯 DATABASE - Buscando players: season=${season}, mode=${mode}`);
      
      this.db.all(`
        SELECT 
          id,
          discord_user_id,
          aoe4_world_id,
          last_game_checkup_at
        FROM users 
        WHERE aoe4_world_id IS NOT NULL 
        AND aoe4_world_id != ''
        ORDER BY id
      `, [], async (err, rows: any[]) => {
        if (err) {
          console.error('❌ Erro no banco de dados:', err);
          resolve([]);
          return;
        }

        console.log(`✅ ${rows.length} usuários encontrados no banco`);
        
        if (rows.length === 0) {
          console.log('ℹ️  Nenhum usuário com AOE4 World ID encontrado');
          resolve([]);
          return;
        }

        const players: Player[] = [];
        const modoRequisitado = mode || 'solo';
        let processados = 0;
        let comDados = 0;
        let semDados = 0;

        console.log(`   ℹ️  Usando dados atuais (limitação da API para dados históricos)`);
        
        const batchSize = 3;
        
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (user) => {
            try {
              processados++;
              console.log(`\n👤 [${processados}/${rows.length}] Processando: ${user.discord_user_id}`);
              
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
                  season: season ? parseInt(season) : undefined
                };
                
                players.push(player);
                
                if (aoe4Data.points > 0) {
                  comDados++;
                  console.log(`   ✅ ${aoe4Data.name} | ${aoe4Data.points} pts | ${aoe4Data.wins}W/${aoe4Data.losses}L`);
                } else {
                  semDados++;
                  console.log(`   ⚪ ${aoe4Data.name} | Sem dados`);
                }
              }
              
            } catch (error) {
              console.log(`   ❌ Erro no usuário ${user.discord_user_id}:`, error);
              semDados++;
            }
          });

          await Promise.allSettled(batchPromises);
          
          if (i + batchSize < rows.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        const playersComPontos = players.filter(p => p.points > 0);
        const playersSemPontos = players.filter(p => p.points === 0);
        
        playersComPontos.sort((a, b) => b.points - a.points);
        playersComPontos.forEach((player, index) => {
          player.rank = index + 1;
        });
        
        playersSemPontos.forEach(player => {
          player.rank = 0;
        });

        const finalPlayers = [...playersComPontos, ...playersSemPontos];

        console.log(`\n📊 RESUMO FINAL:`);
        console.log(`   ✅ Processados: ${processados}/${rows.length}`);
        console.log(`   🎯 Com dados: ${comDados}`);
        console.log(`   ⚪ Sem dados: ${semDados}`);
        console.log(`   🏆 Ranking: ${playersComPontos.length} jogadores`);
        console.log(`   🎮 Modo: ${modoRequisitado}`);

        resolve(finalPlayers);
      });
    });
  }

  async getStats(season?: string, mode?: string) {
    try {
      const players = await this.getPlayers(season, mode);
      
      const totalPlayers = players.length;
      const totalWins = players.reduce((sum, player) => sum + player.wins, 0);
      const highestPoints = players.length > 0 ? Math.max(...players.map(p => p.points)) : 0;
      const totalExperts = players.filter(player => player.points >= 1400).length;

      return {
        totalPlayers,
        totalWins,
        highestPoints,
        totalExperts,
        filters: { season, mode }
      };
    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      throw error;
    }
  }

  // ==================== CLANS METHODS ====================

  async getClans(season?: string): Promise<Clan[]> {
    return new Promise((resolve, reject) => {
      console.log(`\n🏴 DATABASE - Buscando clans: Season=${season || 'current'}`);
      
      this.db.all(`
        SELECT 
          c.id,
          c.name,
          c.tag,
          c.owner_id as leader_id,
          c.description,
          c.discord_guild_id,
          COUNT(cm.discord_user_id) as total_members
        FROM clans c
        LEFT JOIN clan_members cm ON c.id = cm.clan_id
        GROUP BY c.id, c.name, c.tag, c.owner_id
        ORDER BY total_members DESC, c.name ASC
      `, [], async (err, rows: any[]) => {
        if (err) {
          console.error('❌ Erro ao buscar clans:', err);
          resolve([]);
        } else {
          console.log(`✅ ${rows.length} clans encontrados no banco`);
          
          const clansWithStats = await this.enrichClansWithPlayerData(rows);
          resolve(clansWithStats);
        }
      });
    });
  }

  private async enrichClansWithPlayerData(clans: any[]): Promise<Clan[]> {
    console.log(`🎯 Enriquecendo ${clans.length} clans com dados dos jogadores...`);
    
    const enrichedClans: Clan[] = [];
    
    for (const clan of clans) {
      try {
        console.log(`\n🔍 Processando clan: ${clan.name} (ID: ${clan.id})`);
        
        const clanStats = await this.getClanStats(clan.id);
        
        const enrichedClan: Clan = {
          id: clan.id,
          name: clan.name,
          tag: clan.tag,
          leader_id: clan.leader_id,
          description: clan.description || 'Sem descrição',
          total_members: clan.total_members || 0,
          average_elo: clanStats.average_elo,
          total_points: clanStats.total_points,
          active_players: clanStats.active_players,
          rank: 0
        };
        
        enrichedClans.push(enrichedClan);
        
        console.log(`   ✅ Clan ${clan.name}:`, {
          membros: clan.total_members,
          jogadores_ativos: clanStats.active_players,
          elo_medio: clanStats.average_elo,
          total_points: clanStats.total_points
        });
        
      } catch (error) {
        console.error(`❌ Erro ao enriquecer clan ${clan.name}:`, error);
        
        enrichedClans.push({
          id: clan.id,
          name: clan.name,
          tag: clan.tag,
          leader_id: clan.leader_id,
          description: clan.description || 'Sem descrição',
          total_members: clan.total_members || 0,
          average_elo: 1200,
          total_points: 10000,
          active_players: 0,
          rank: 0
        });
      }
    }
    
    enrichedClans.sort((a, b) => b.total_points - a.total_points);
    enrichedClans.forEach((clan, index) => {
      clan.rank = index + 1;
    });
    
    console.log(`\n📊 RESUMO CLANS:`, {
      total: enrichedClans.length,
      com_dados: enrichedClans.filter(c => c.active_players > 0).length,
      ranking_aplicado: true
    });
    
    return enrichedClans;
  }

  private async getClanStats(clanId: number): Promise<{average_elo: number, total_points: number, active_players: number}> {
    return new Promise((resolve, reject) => {
      console.log(`   📊 Buscando estatísticas do clan ${clanId}...`);
      
      this.db.all(`
        SELECT discord_user_id 
        FROM clan_members 
        WHERE clan_id = ?
      `, [clanId], async (err, memberRows: any[]) => {
        if (err) {
          console.error(`   ❌ Erro ao buscar membros do clan ${clanId}:`, err);
          resolve({ average_elo: 0, total_points: 0, active_players: 0 });
          return;
        }
        
        console.log(`   👥 ${memberRows.length} membros encontrados no clan`);
        
        if (memberRows.length === 0) {
          resolve({ average_elo: 0, total_points: 0, active_players: 0 });
          return;
        }
        
        const memberIds = memberRows.map(m => m.discord_user_id);
        const placeholders = memberIds.map(() => '?').join(',');
        
        this.db.all(`
          SELECT 
            u.discord_user_id,
            u.aoe4_world_id
          FROM users u
          WHERE u.discord_user_id IN (${placeholders})
          AND u.aoe4_world_id IS NOT NULL
          AND u.aoe4_world_id != ''
        `, memberIds, async (err, userRows: any[]) => {
          if (err) {
            console.error('   ❌ Erro ao buscar dados dos usuários do clan:', err);
            resolve({ average_elo: 0, total_points: 0, active_players: 0 });
            return;
          }
          
          console.log(`   🎯 ${userRows.length} usuários com AOE4 ID encontrados`);
          
          let totalElo = 0;
          let totalPoints = 0;
          let activePlayers = 0;
          let playersProcessed = 0;
          
          const batchSize = 5;
          
          for (let i = 0; i < userRows.length; i += batchSize) {
            const batch = userRows.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (user) => {
              try {
                const playerData = await this.getAOE4WorldData(user.aoe4_world_id, 'solo');
                if (playerData && playerData.elo > 0 && playerData.points > 0) {
                  totalElo += playerData.elo;
                  totalPoints += playerData.points;
                  activePlayers++;
                  console.log(`   ✅ ${user.discord_user_id}: ${playerData.elo} ELO, ${playerData.points} pts`);
                } else {
                  console.log(`   ⚠️  ${user.discord_user_id}: dados insuficientes`);
                }
              } catch (error) {
                console.log(`   ❌ ${user.discord_user_id}: erro na API`);
              }
              playersProcessed++;
            });
            
            await Promise.allSettled(batchPromises);
            
            if (i + batchSize < userRows.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          const averageElo = activePlayers > 0 ? Math.round(totalElo / activePlayers) : 0;
          
          console.log(`   📈 Estatísticas finais do clan:`, {
            jogadores_processados: playersProcessed,
            jogadores_ativos: activePlayers,
            elo_medio: averageElo,
            total_points: Math.round(totalPoints)
          });
          
          resolve({
            average_elo: averageElo,
            total_points: Math.round(totalPoints),
            active_players: activePlayers
          });
        });
      });
    });
  }

  async getClanById(clanId: number): Promise<Clan | null> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          c.*,
          COUNT(cm.discord_user_id) as total_members
        FROM clans c
        LEFT JOIN clan_members cm ON c.id = cm.clan_id
        WHERE c.id = ?
        GROUP BY c.id
      `, [clanId], async (err, row: any) => {
        if (err) {
          console.error(`❌ Erro ao buscar clan ${clanId}:`, err);
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          const clanStats = await this.getClanStats(clanId);
          resolve({
            id: row.id,
            name: row.name,
            tag: row.tag,
            leader_id: row.owner_id,
            description: row.description,
            total_members: row.total_members,
            average_elo: clanStats.average_elo,
            total_points: clanStats.total_points,
            active_players: clanStats.active_players,
            rank: 0
          });
        }
      });
    });
  }

  async getClanMembers(clanId: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          cm.discord_user_id,
          cm.is_owner,
          cm.joined_at,
          u.aoe4_world_id,
          u.discord_user_id as user_discord_id
        FROM clan_members cm
        LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
        WHERE cm.clan_id = ?
        ORDER BY cm.is_owner DESC, cm.joined_at ASC
      `, [clanId], async (err, rows: any[]) => {
        if (err) {
          console.error(`❌ Erro ao buscar membros do clan ${clanId}:`, err);
          resolve([]);
        } else {
          console.log(`✅ ${rows.length} membros encontrados no clan ${clanId}`);
          
          const enrichedMembers = [];
          
          for (const member of rows) {
            try {
              if (member.aoe4_world_id && member.aoe4_world_id !== 'unknown') {
                console.log(`   🌐 Buscando dados para: ${member.aoe4_world_id}`);
                
                const playerData = await this.getAOE4WorldData(member.aoe4_world_id, 'solo');
                
                if (playerData && playerData.name) {
                  const finalData = {
                    discord_user_id: member.discord_user_id,
                    is_owner: member.is_owner,
                    joined_at: member.joined_at,
                    aoe4_world_id: member.aoe4_world_id,
                    name: playerData.name,
                    profile_url: playerData.profile_url,
                    rank_level: playerData.rank_level || 'Unranked',
                    points: playerData.points || 0,
                    elo: playerData.elo || 0,
                    win_rate: playerData.win_rate || 0,
                    wins: playerData.wins || 0,
                    losses: playerData.losses || 0,
                    total_matches: playerData.total_matches || 0,
                    last_game: playerData.last_game || 'Nunca',
                    global_rank: playerData.global_rank || 0
                  };
                  
                  enrichedMembers.push(finalData);
                  console.log(`   ✅ ${finalData.name}: ${finalData.points} pts, ${finalData.elo} ELO`);
                } else {
                  enrichedMembers.push({
                    discord_user_id: member.discord_user_id,
                    is_owner: member.is_owner,
                    joined_at: member.joined_at,
                    aoe4_world_id: member.aoe4_world_id,
                    name: `Jogador_${member.aoe4_world_id.substring(0, 8)}`,
                    profile_url: `https://aoe4world.com/players/${member.aoe4_world_id}`,
                    rank_level: 'Unranked',
                    points: 0,
                    elo: 0,
                    win_rate: 0,
                    wins: 0,
                    losses: 0,
                    total_matches: 0,
                    last_game: 'Nunca',
                    global_rank: 0
                  });
                }
              } else {
                enrichedMembers.push({
                  discord_user_id: member.discord_user_id,
                  is_owner: member.is_owner,
                  joined_at: member.joined_at,
                  aoe4_world_id: 'unknown',
                  name: `Membro_${member.discord_user_id.substring(0, 8)}`,
                  profile_url: '#',
                  rank_level: 'Unranked',
                  points: 0,
                  elo: 0,
                  win_rate: 0,
                  wins: 0,
                  losses: 0,
                  total_matches: 0,
                  last_game: 'Nunca',
                  global_rank: 0
                });
              }
            } catch (error) {
              console.error(`   ❌ Erro no membro ${member.discord_user_id}:`, error);
              enrichedMembers.push({
                discord_user_id: member.discord_user_id,
                is_owner: member.is_owner,
                joined_at: member.joined_at,
                aoe4_world_id: member.aoe4_world_id || 'unknown',
                name: `Membro_${member.discord_user_id.substring(0, 8)}`,
                profile_url: member.aoe4_world_id ? 
                  `https://aoe4world.com/players/${member.aoe4_world_id}` : '#',
                rank_level: 'Unranked',
                points: 0,
                elo: 0,
                win_rate: 0,
                wins: 0,
                losses: 0,
                total_matches: 0,
                last_game: 'Nunca',
                global_rank: 0
              });
            }
          }
          
          console.log(`📊 RESUMO FINAL - Clan ${clanId}:`, {
            total: enrichedMembers.length,
            membros_com_nome: enrichedMembers.filter(m => !m.name.includes('Membro_')).length
          });
          
          resolve(enrichedMembers);
        }
      });
    });
  }

  // ==================== SEASONS METHODS ====================

  async getSeasons(): Promise<Season[]> {
    try {
      console.log('🌐 Buscando temporadas...');
      
      const response = await fetch('https://aoe4world.com/api/v0/games/aoe4/seasons');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.seasons || data.seasons.length === 0) {
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

      console.log(`✅ ${seasons.length} temporadas carregadas`);
      
      return seasons;
      
    } catch (error) {
      console.error('❌ Erro ao buscar temporadas:', error);
      
      return [
        {
          id: 12,
          name: 'Season 12',
          start_date: '2024-11-01',
          end_date: 'Presente',
          is_current: true
        },
        {
          id: 11,
          name: 'Season 11', 
          start_date: '2024-08-01',
          end_date: '2024-10-31',
          is_current: false
        },
        {
          id: 10,
          name: 'Season 10',
          start_date: '2024-05-01',
          end_date: '2024-07-31',
          is_current: false
        },
        {
          id: 9,
          name: 'Season 9',
          start_date: '2024-02-01',
          end_date: '2024-04-30',
          is_current: false
        },
        {
          id: 8,
          name: 'Season 8',
          start_date: '2023-11-01',
          end_date: '2024-01-31',
          is_current: false
        },
        {
          id: 7,
          name: 'Season 7',
          start_date: '2023-08-01',
          end_date: '2023-10-31',
          is_current: false
        }
      ];
    }
  }

  // ==================== AOE4 WORLD API METHODS ====================

  private async getAOE4WorldData(aoe4WorldId: string, mode?: string): Promise<any> {
    try {
      console.log(`   🌐🔍 BUSCANDO DADOS DETALHADOS: Player ${aoe4WorldId}, Mode ${mode}`);
      
      const response = await fetch(`https://aoe4world.com/api/v0/players/${aoe4WorldId}`);
      
      if (!response.ok) {
        console.log(`   ❌ API respondeu com erro: HTTP ${response.status}`);
        return this.createFallbackData(aoe4WorldId, undefined, mode, true);
      }
      
      const data = await response.json();
      console.log(`   ✅ API response - Nome: "${data.name}", ID: ${aoe4WorldId}`);
      
      const modeData = this.findAnyGameModeData(data, mode || 'solo');
      
      if (!modeData) {
        console.log(`   ⚠️  Nenhum dado de modo encontrado para ${aoe4WorldId}`);
        console.log(`   📋 Dados disponíveis:`, {
          modes: Object.keys(data.modes || {}),
          name: data.name,
          hasData: !!data
        });
        return this.createFallbackData(aoe4WorldId, data.name, mode, true);
      }
      
      const seasonRankGlobal = modeData.rank || 0;
      const pointsValue = modeData.rating || 0;

      let eloValue = pointsValue;
      let eloSource = 'rating_fallback';
      
      if (mode === 'solo') {
        if (data.modes?.rm_1v1_elo?.rating) {
          eloValue = data.modes.rm_1v1_elo.rating;
          eloSource = 'rm_1v1_elo';
        }
        else if (modeData.max_rating) {
          eloValue = modeData.max_rating;
          eloSource = 'max_rating';
        }
      } else {
        eloValue = modeData.max_rating || pointsValue;
        eloSource = modeData.max_rating ? 'team_max_rating' : 'team_rating';
      }

      const lastGameAt = modeData.last_game_at || data.last_game_at;
      let lastGameFormatted = "Nunca";
      let lastGameTimestamp = 0;

      if (lastGameAt) {
        try {
          const lastGameDate = new Date(lastGameAt);
          lastGameFormatted = this.formatLastGame(lastGameDate);
          lastGameTimestamp = lastGameDate.getTime();
        } catch (dateError) {
          console.log(`   ⚠️  Erro ao formatar data: ${lastGameAt}`);
        }
      }

let rankLevel = 'Unranked';
if (pointsValue > 0) {
  rankLevel = this.getRankLevel(pointsValue);
} else if (eloValue > 0) {
  // Se não tem points mas tem ELO, calcular rank baseado no ELO
  rankLevel = this.getRankLevel(eloValue);
}

console.log(`   📊 DADOS OBTIDOS:`, {
  name: data.name,
  points: pointsValue,
  elo: eloValue,
  wins: modeData.wins_count || 0,
  losses: modeData.losses_count || 0,
  win_rate: modeData.win_rate || 0,
  rank_level: rankLevel // 🔥 MOSTRAR O RANK CALCULADO
});

return {
  name: data.name || `Player_${aoe4WorldId}`,
  profile_url: `https://aoe4world.com/players/${aoe4WorldId}`,
  season_rank_global: seasonRankGlobal || 0,
  points: pointsValue || 0,
  elo: eloValue || 0,
  wins: modeData.wins_count || 0,
  losses: modeData.losses_count || 0,
  win_rate: modeData.win_rate || 0,
  total_matches: (modeData.wins_count || 0) + (modeData.losses_count || 0),
  last_game: lastGameFormatted,
  last_game_timestamp: lastGameTimestamp,
  dataSource: modeData.source || 'api',
  eloSource: eloSource,
  rank_level: rankLevel // 🔥 ADICIONAR RANK LEVEL AQUI
};
      
    } catch (error: any) {
      console.log(`   ❌ ERRO NA API: ${aoe4WorldId} - ${error.message}`);
      return this.createFallbackData(aoe4WorldId, undefined, mode, true);
    }
  }

  private findAnyGameModeData(playerData: any, requestedMode: string) {
    console.log(`   🔍 Procurando dados para modo: ${requestedMode}`);
    
    if (playerData.modes) {
      console.log(`   📋 Modos disponíveis:`, Object.keys(playerData.modes));
      
      if (requestedMode === 'solo') {
        if (playerData.modes.rm_solo) {
          console.log('   ✅ SOLO: rm_solo encontrado');
          return { ...playerData.modes.rm_solo, source: 'rm_solo' };
        }
        if (playerData.modes.rm_1v1) {
          console.log('   ✅ SOLO: rm_1v1 encontrado');
          return { ...playerData.modes.rm_1v1, source: 'rm_1v1' };
        }
        
        const soloModes = Object.keys(playerData.modes).filter(mode => 
          mode.includes('solo') || mode.includes('1v1')
        );
        if (soloModes.length > 0) {
          const soloMode = soloModes[0];
          console.log(`   ✅ SOLO: ${soloMode} encontrado (modo solo)`);
          return { ...playerData.modes[soloMode], source: soloMode };
        }
      }
      
      if (requestedMode === 'team') {
        if (playerData.modes.rm_team) {
          console.log('   ✅ TEAM: rm_team encontrado');
          return { ...playerData.modes.rm_team, source: 'rm_team' };
        }
        
        const teamModes = ['rm_2v2', 'rm_3v3', 'rm_4v4', 'qm_2v2', 'qm_3v3', 'qm_4v4'];
        for (const teamMode of teamModes) {
          if (playerData.modes[teamMode]) {
            console.log(`   ✅ TEAM: ${teamMode} encontrado`);
            return { ...playerData.modes[teamMode], source: teamMode };
          }
        }
        
        const teamModesRegex = Object.keys(playerData.modes).filter(mode => 
          mode.includes('team') || /\d+v\d+/.test(mode)
        );
        if (teamModesRegex.length > 0) {
          const teamMode = teamModesRegex[0];
          console.log(`   ✅ TEAM: ${teamMode} encontrado (modo team)`);
          return { ...playerData.modes[teamMode], source: teamMode };
        }
      }
      
      const availableModes = Object.keys(playerData.modes);
      if (availableModes.length > 0) {
        const firstMode = availableModes[0];
        console.log(`   🔄 Fallback: usando ${firstMode} (primeiro modo disponível)`);
        return { ...playerData.modes[firstMode], source: `fallback_${firstMode}` };
      }
    }
    
    if (playerData.leaderboards) {
      console.log(`   📊 Leaderboards disponíveis:`, Object.keys(playerData.leaderboards));
      
      if (requestedMode === 'solo' && playerData.leaderboards.rm_1v1) {
        console.log('   ✅ SOLO: leaderboard rm_1v1 encontrado');
        return { ...playerData.leaderboards.rm_1v1, source: 'leaderboard_rm_1v1' };
      }
      
      if (requestedMode === 'team') {
        const teamLeaderboards = ['rm_2v2', 'rm_3v3', 'rm_4v4', 'rm_team'];
        for (const leaderboard of teamLeaderboards) {
          if (playerData.leaderboards[leaderboard]) {
            console.log(`   ✅ TEAM: leaderboard ${leaderboard} encontrado`);
            return { ...playerData.leaderboards[leaderboard], source: `leaderboard_${leaderboard}` };
          }
        }
      }
    }
    
    console.log(`   ❌ Nenhum dado encontrado para modo ${requestedMode}`);
    return null;
  }

  // ==================== UTILITY METHODS ====================

  private createFallbackData(aoe4WorldId: string, playerName?: string, mode?: string, noData: boolean = false) {
    console.log(`   🛠️  Criando dados fallback: ${noData ? 'SEM DADOS' : 'COM DADOS'}`);
    
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
        last_game_timestamp: 0,
        dataSource: 'no_data_fallback',
        eloSource: 'no_data'
      };
    }
    
    const isTeam = mode === 'team';
    const basePoints = isTeam ? 1200 : 1300;
    const baseWins = isTeam ? 20 : 15;
    const baseLosses = isTeam ? 15 : 10;
    const namePrefix = isTeam ? 'Team_' : '';
    
    const points = basePoints + Math.random() * 300;
    const eloVariation = (Math.random() - 0.5) * 100;
    const eloValue = Math.max(800, Math.round(points + eloVariation));
    
    const wins = baseWins + Math.floor(Math.random() * 20);
    const losses = baseLosses + Math.floor(Math.random() * 15);
    const totalMatches = wins + losses;
    const winRate = Math.round((wins / totalMatches) * 100);
    
    return {
      name: playerName || `${namePrefix}Player_${aoe4WorldId}`,
      profile_url: `https://aoe4world.com/players/${aoe4WorldId}`,
      season_rank_global: (isTeam ? 10000 : 5000) + Math.floor(Math.random() * 50000),
      points: points,
      elo: eloValue,
      wins: wins,
      losses: losses,
      win_rate: winRate,
      total_matches: totalMatches,
      last_game: "há " + (1 + Math.floor(Math.random() * 7)) + " dias",
      last_game_timestamp: Date.now() - (Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
      dataSource: 'fallback',
      eloSource: 'fallback'
    };
  }

  private formatLastGame(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 30) return date.toLocaleDateString('pt-BR');
    if (diffDays > 0) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffMinutes > 0) return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    return 'agora mesmo';
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

  close() {
    this.db.close();
  }
}

export const database = new Database();