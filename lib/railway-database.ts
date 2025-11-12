// lib/railway-database.ts - VERSÃO COMPLETA E REVISADA PARA RAILWAY (PostgreSQL)
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

  // =======================================================
  // ==================== PLAYERS METHODS ===================
  // =======================================================

  async getPlayers(season?: string, mode?: string): Promise<Player[]> {
    try {
      console.log(`\n🎯 RAILWAY - Buscando players: season=${season}, mode=${mode}`);

      const query = `
        SELECT id, discord_user_id, aoe4_world_id
        FROM users 
        WHERE aoe4_world_id IS NOT NULL AND aoe4_world_id != ''
        ORDER BY id
      `;

      const { rows } = await this.pool.query(query);
      console.log(`✅ ${rows.length} usuários encontrados no Railway`);

      const players: Player[] = [];
      const modoRequisitado = mode || 'solo';
      const batchSize = 3;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        const batchPromises = batch.map(async (user) => {
          try {
            const aoe4Data = await this.getAOE4WorldData(user.aoe4_world_id, modoRequisitado);
            if (aoe4Data) {
              players.push({
                rank: 0,
                name: aoe4Data.name,
                profile_url: aoe4Data.profile_url,
                global_rank: aoe4Data.season_rank_global || 0,
                season_rank_global: aoe4Data.season_rank_global || 0,
                rank_level: this.getRankLevel(aoe4Data.points),
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
              });
            }
          } catch (err) {
            console.error(`❌ Erro no usuário ${user.discord_user_id}:`, err);
          }
        });

        await Promise.allSettled(batchPromises);
        if (i + batchSize < rows.length) await new Promise(r => setTimeout(r, 500));
      }

      players.sort((a, b) => b.points - a.points);
      players.forEach((p, i) => (p.rank = i + 1));

      return players;
    } catch (err) {
      console.error('❌ Erro no Railway getPlayers:', err);
      return [];
    }
  }

  // =======================================================
  // ==================== CLANS METHODS =====================
  // =======================================================

  async getClans(): Promise<Clan[]> {
    try {
      const query = `
        SELECT 
          c.id, c.name, c.tag, c.owner_id as leader_id,
          c.description, COUNT(cm.discord_user_id) as total_members
        FROM clans c
        LEFT JOIN clan_members cm ON c.id = cm.clan_id
        GROUP BY c.id
        ORDER BY total_members DESC;
      `;

      const { rows } = await this.pool.query(query);
      return this.enrichClansWithPlayerData(rows);
    } catch (err) {
      console.error('❌ Erro ao buscar clans:', err);
      return [];
    }
  }

  private async enrichClansWithPlayerData(clans: any[]): Promise<Clan[]> {
    const enriched: Clan[] = [];
    for (const clan of clans) {
      const stats = await this.getClanStats(clan.id);
      enriched.push({
        id: clan.id,
        name: clan.name,
        tag: clan.tag,
        leader_id: clan.leader_id,
        description: clan.description || 'Sem descrição',
        total_members: clan.total_members || 0,
        average_elo: stats.average_elo,
        total_points: stats.total_points,
        active_players: stats.active_players,
        rank: 0,
      });
    }
    enriched.sort((a, b) => b.total_points - a.total_points);
    enriched.forEach((c, i) => (c.rank = i + 1));
    return enriched;
  }

  private async getClanStats(clanId: number): Promise<{ average_elo: number; total_points: number; active_players: number }> {
    try {
      const members = await this.pool.query(`SELECT discord_user_id FROM clan_members WHERE clan_id = $1`, [clanId]);
      const ids = members.rows.map(m => m.discord_user_id);
      if (!ids.length) return { average_elo: 0, total_points: 0, active_players: 0 };

      const users = await this.pool.query(
        `SELECT aoe4_world_id FROM users WHERE discord_user_id = ANY($1::text[]) AND aoe4_world_id IS NOT NULL`,
        [ids]
      );

      let totalElo = 0, totalPoints = 0, active = 0;
      for (const u of users.rows) {
        const data = await this.getAOE4WorldData(u.aoe4_world_id, 'solo');
        if (data && data.elo > 0) {
          totalElo += data.elo;
          totalPoints += data.points;
          active++;
        }
      }

      return {
        average_elo: active ? Math.round(totalElo / active) : 0,
        total_points: totalPoints,
        active_players: active,
      };
    } catch {
      return { average_elo: 0, total_points: 0, active_players: 0 };
    }
  }

  // =======================================================
  // ==================== AOE4 WORLD API ====================
  // =======================================================

  private async getAOE4WorldData(aoe4WorldId: string, mode?: string): Promise<any> {
    try {
      const res = await fetch(`https://aoe4world.com/api/v0/players/${aoe4WorldId}`);
      const data = await res.json();
      const modeData = this.findAnyGameModeData(data, mode || 'rm_1v1');

      if (!modeData) return this.createFallbackData(aoe4WorldId, data.name, mode, true);

      const lastGameAt = modeData.last_game_at ? new Date(modeData.last_game_at) : null;

      return {
        name: data.name || `Player_${aoe4WorldId}`,
        profile_url: `https://aoe4world.com/players/${aoe4WorldId}`,
        season_rank_global: modeData.rank || 0,
        points: modeData.rating || 0,
        elo: modeData.max_rating || modeData.rating,
        wins: modeData.wins_count || 0,
        losses: modeData.losses_count || 0,
        win_rate: modeData.win_rate || 0,
        total_matches: modeData.games_count || 0,
        last_game: lastGameAt ? this.formatLastGame(lastGameAt) : 'Nunca',
        last_game_timestamp: lastGameAt?.getTime() || 0,
      };
    } catch (err) {
      console.error(`❌ Erro na API AOE4World (${aoe4WorldId}):`, err);
      return this.createFallbackData(aoe4WorldId, undefined, mode, true);
    }
  }

  private findAnyGameModeData(data: any, requestedMode: string) {
    return (
      data.modes?.[requestedMode] ||
      data.leaderboards?.[requestedMode] ||
      data.modes?.['rm_1v1'] ||
      data.modes?.['rm_team'] ||
      null
    );
  }

  private createFallbackData(aoe4WorldId: string, playerName?: string, mode?: string, noData = false) {
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
        last_game: 'Sem dados',
        last_game_timestamp: 0,
      };
    }
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

  private getRankLevel(points: number): string {
    if (points >= 1600) return 'Conquer 3';
    if (points >= 1500) return 'Conquer 2';
    if (points >= 1400) return 'Conquer 1';
    if (points >= 1350) return 'Diamante 3';
    if (points >= 1300) return 'Diamante 2';
    if (points >= 1200) return 'Diamante 1';
    if (points >= 1150) return 'Platina 3';
    if (points >= 1100) return 'Platina 2';
    if (points >= 1000) return 'Platina 1';
    if (points >= 900) return 'Ouro 3';
    if (points >= 800) return 'Ouro 2';
    if (points >= 700) return 'Ouro 1';
    if (points >= 600) return 'Prata 3';
    if (points >= 550) return 'Prata 2';
    if (points >= 500) return 'Prata 1';
    if (points >= 450) return 'Bronze 3';
    if (points >= 400) return 'Bronze 2';
    return 'Bronze 1';
  }

  // =======================================================
  // ==================== UTILITIES =========================
  // =======================================================

  async close() {
    await this.pool.end();
  }
}

export const railwayDatabase = new RailwayDatabase();
