// lib/railway-database.ts - VERSÃO PARA RAILWAY (PostgreSQL)
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

class RailwayDatabase {
  private pool: Pool;

  constructor() {
    console.log('🔌 Conectando ao Railway PostgreSQL...');
    
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Testar conexão
    this.testConnection();
  }

  private async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('✅ Conectado ao Railway PostgreSQL com sucesso!');
      client.release();
    } catch (error) {
      console.error('❌ Erro ao conectar com Railway:', error);
    }
  }

  // ==================== PLAYERS METHODS ====================

  async getPlayers(season?: string, mode?: string): Promise<Player[]> {
    try {
      console.log(`\n🎯 RAILWAY - Buscando players: season=${season}, mode=${mode}`);
      
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

      console.log(`✅ ${rows.length} usuários encontrados no Railway`);
      
      if (rows.length === 0) {
        console.log('ℹ️  Nenhum usuário com AOE4 World ID encontrado');
        return [];
      }

      // O RESTANTE DO CÓDIGO É IGUAL - só muda a parte do banco
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

      console.log(`\n📊 RESUMO FINAL RAILWAY:`);
      console.log(`   ✅ Processados: ${processados}/${rows.length}`);
      console.log(`   🎯 Com dados: ${comDados}`);
      console.log(`   ⚪ Sem dados: ${semDados}`);
      console.log(`   🏆 Ranking: ${playersComPontos.length} jogadores`);
      console.log(`   🎮 Modo: ${modoRequisitado}`);

      return finalPlayers;
    } catch (error) {
      console.error('❌ Erro no Railway getPlayers:', error);
      return [];
    }
  }

  // ==================== CLANS METHODS ====================

  async getClans(season?: string): Promise<Clan[]> {
    try {
      console.log(`\n🏴 RAILWAY - Buscando clans: Season=${season || 'current'}`);
      
      const query = `
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
      `;

      const result = await this.pool.query(query);
      const rows = result.rows;

      console.log(`✅ ${rows.length} clans encontrados no Railway`);
      
      const clansWithStats = await this.enrichClansWithPlayerData(rows);
      return clansWithStats;
    } catch (error) {
      console.error('❌ Erro ao buscar clans no Railway:', error);
      return [];
    }
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
    
    console.log(`\n📊 RESUMO CLANS RAILWAY:`, {
      total: enrichedClans.length,
      com_dados: enrichedClans.filter(c => c.active_players > 0).length,
      ranking_aplicado: true
    });
    
    return enrichedClans;
  }

  private async getClanStats(clanId: number): Promise<{average_elo: number, total_points: number, active_players: number}> {
    try {
      console.log(`   📊 Buscando estatísticas do clan ${clanId}...`);
      
      // Buscar membros do clan
      const membersQuery = `
        SELECT discord_user_id 
        FROM clan_members 
        WHERE clan_id = $1
      `;
      const membersResult = await this.pool.query(membersQuery, [clanId]);
      const memberRows = membersResult.rows;

      console.log(`   👥 ${memberRows.length} membros encontrados no clan`);
      
      if (memberRows.length === 0) {
        return { average_elo: 0, total_points: 0, active_players: 0 };
      }
      
      const memberIds = memberRows.map(m => m.discord_user_id);
      const placeholders = memberIds.map((_, i) => `$${i + 1}`).join(',');
      
      // Buscar usuários com AOE4 ID
      const usersQuery = `
        SELECT 
          u.discord_user_id,
          u.aoe4_world_id
        FROM users u
        WHERE u.discord_user_id IN (${placeholders})
        AND u.aoe4_world_id IS NOT NULL
        AND u.aoe4_world_id != ''
      `;
      const usersResult = await this.pool.query(usersQuery, memberIds);
      const userRows = usersResult.rows;
      
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
      
      return {
        average_elo: averageElo,
        total_points: Math.round(totalPoints),
        active_players: activePlayers
      };
    } catch (error) {
      console.error(`   ❌ Erro ao buscar stats do clan ${clanId}:`, error);
      return { average_elo: 0, total_points: 0, active_players: 0 };
    }
  }

  // ==================== AOE4 WORLD API METHODS ====================
  // (ESTES MÉTODOS SÃO IDÊNTICOS - só copie do arquivo original)

  private async getAOE4WorldData(aoe4WorldId: string, mode?: string): Promise<any> {
    // COLE AQUI O MÉTODO getAOE4WorldData COMPLETO DO ARQUIVO ORIGINAL
    // É exatamente igual, então não preciso duplicar aqui
  }

  private findAnyGameModeData(playerData: any, requestedMode: string) {
    // COLE AQUI O MÉTODO findAnyGameModeData COMPLETO  
  }

  private createFallbackData(aoe4WorldId: string, playerName?: string, mode?: string, noData: boolean = false) {
    // COLE AQUI O MÉTODO createFallbackData COMPLETO
  }

  private formatLastGame(date: Date): string {
    // COLE AQUI O MÉTODO formatLastGame COMPLETO
  }

  private getRankLevel(pointsOrElo: number): string {
    // COLE AQUI O MÉTODO getRankLevel COMPLETO
  }

  // ==================== UTILITY METHODS ====================

  async close() {
    await this.pool.end();
  }
}

export const railwayDatabase = new RailwayDatabase();