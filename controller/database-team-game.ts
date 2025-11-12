// controller/database-team-game.ts
import { Pool } from 'pg';

// ✅ Conexão com banco PostgreSQL (Railway)
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:ljPQHCOBFkYKHSAnZshLkQDmSWDZqBqW@mainline.proxy.rlwy.net:27194/railway',
  ssl: { rejectUnauthorized: false },
});

export interface TeamPlayer {
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
  team_modes: {
    rm_2v2?: TeamModeStats;
    rm_3v3?: TeamModeStats;
    rm_4v4?: TeamModeStats;
  };
  preferred_team_mode: string;
}

export interface TeamModeStats {
  rating: number;
  rank: number;
  max_rating: number;
  games_count: number;
  wins_count: number;
  losses_count: number;
  win_rate: number;
  last_game_at: string;
}

class TeamDatabase {
  constructor() {
    console.log('🔌 Conectando ao banco PostgreSQL para TEAM GAME (RM apenas)...');
  }

  async getPlayers(): Promise<TeamPlayer[]> {
    try {
      const client = await pool.connect();
      const result = await client.query(
        `
        SELECT 
          id,
          discord_user_id,
          aoe4_world_id,
          last_game_checkup_at
        FROM users 
        WHERE aoe4_world_id IS NOT NULL 
        AND aoe4_world_id != ''
        ORDER BY id
        `
      );
      client.release();

      const rows = result.rows;
      console.log(`✅ ${rows.length} usuários com AOE4 World ID encontrados para TEAM GAME`);

      const players: TeamPlayer[] = [];

      for (const user of rows) {
        try {
          const teamData = await this.getTeamGameData(user.aoe4_world_id);

          if (teamData) {
            players.push({
              rank: 0,
              name: teamData.name,
              profile_url: teamData.profile_url,
              global_rank: teamData.season_rank_global || 0,
              season_rank_global: teamData.season_rank_global || 0,
              rank_level: this.getRankLevel(teamData.points),
              points: teamData.points,
              elo: teamData.elo,
              win_rate: teamData.win_rate,
              wins: teamData.wins,
              losses: teamData.losses,
              total_matches: teamData.total_matches,
              last_game: teamData.last_game,
              last_game_timestamp: teamData.last_game_timestamp,
              id: user.id,
              discord_user_id: user.discord_user_id,
              aoe4_world_id: user.aoe4_world_id,
              team_modes: teamData.team_modes,
              preferred_team_mode: teamData.preferred_team_mode,
            });

            console.log(
              `📊 ${teamData.name}: Team Points ${teamData.points}, Preferred Mode: ${teamData.preferred_team_mode}`
            );
          }
        } catch (error) {
          console.log(
            `⚠️ Erro no usuário ${user.discord_user_id} para TEAM GAME, usando dados de exemplo`
          );
          players.push(this.createExampleTeamPlayer(user, players.length));
        }
      }

      players.sort((a, b) => b.points - a.points);
      players.forEach((player, index) => {
        player.rank = index + 1;
      });

      return players;
    } catch (err) {
      console.error('❌ Erro ao buscar jogadores do PostgreSQL:', err);
      throw err;
    }
  }

  private async getTeamGameData(aoe4WorldId: string): Promise<any> {
    try {
      const response = await fetch(`https://aoe4world.com/api/v0/players/${aoe4WorldId}`);
      const data = await response.json();

      console.log(`\n🔍 Analisando player para TEAM GAME (RM): ${data.name || aoe4WorldId}`);

      const teamModes = {
        rm_2v2: this.extractTeamModeData(data, 'rm_2v2'),
        rm_3v3: this.extractTeamModeData(data, 'rm_3v3'),
        rm_4v4: this.extractTeamModeData(data, 'rm_4v4'),
      };

      const preferredTeamMode = this.findPreferredTeamMode(teamModes);
      const preferredModeData = teamModes[preferredTeamMode as keyof typeof teamModes];

      const seasonRankGlobal = preferredModeData?.rank || 0;
      const pointsValue = preferredModeData?.rating || 1000;
      const eloValue = preferredModeData?.max_rating || pointsValue;
      const lastGameAt = this.findLastTeamGame(teamModes);

      let lastGameFormatted = 'Nunca';
      let lastGameTimestamp = 0;

      if (lastGameAt) {
        const lastGameDate = new Date(lastGameAt);
        lastGameFormatted = this.formatLastGame(lastGameDate);
        lastGameTimestamp = lastGameDate.getTime();
      }

      return {
        name: data.name || `Player_${aoe4WorldId}`,
        profile_url: `https://aoe4world.com/players/${aoe4WorldId}`,
        season_rank_global: seasonRankGlobal,
        points: pointsValue,
        elo: eloValue,
        wins: preferredModeData?.wins_count || 0,
        losses: preferredModeData?.losses_count || 0,
        win_rate: preferredModeData?.win_rate || 0,
        total_matches: preferredModeData?.games_count || 0,
        last_game: lastGameFormatted,
        last_game_timestamp: lastGameTimestamp,
        team_modes: teamModes,
        preferred_team_mode: preferredTeamMode,
      };
    } catch (error) {
      console.log(`❌ AOE4 World API falhou para ${aoe4WorldId}:`, error);
      throw error;
    }
  }

  private extractTeamModeData(data: any, mode: string): TeamModeStats {
    const modeData = data.modes?.[mode] || data.leaderboards?.[mode];

    return {
      rating: modeData?.rating || 0,
      rank: modeData?.rank || 0,
      max_rating: modeData?.max_rating || 0,
      games_count: modeData?.games_count || 0,
      wins_count: modeData?.wins_count || 0,
      losses_count: modeData?.losses_count || 0,
      win_rate: modeData?.win_rate || 0,
      last_game_at: modeData?.last_game_at || '',
    };
  }

  private findPreferredTeamMode(teamModes: any): string {
    let preferredMode = 'rm_4v4';
    let highestGames = 0;
    let highestRating = 0;

    Object.entries(teamModes).forEach(([mode, stats]: [string, any]) => {
      if (stats.games_count > highestGames) {
        highestGames = stats.games_count;
        preferredMode = mode;
      }

      if (stats.rating > highestRating && stats.games_count >= 5) {
        highestRating = stats.rating;
        preferredMode = mode;
      }
    });

    return preferredMode;
  }

  private findLastTeamGame(teamModes: any): string | null {
    let lastGame = null;
    let lastTimestamp = 0;

    Object.entries(teamModes).forEach(([mode, stats]: [string, any]) => {
      if (stats.last_game_at) {
        const timestamp = new Date(stats.last_game_at).getTime();
        if (timestamp > lastTimestamp) {
          lastTimestamp = timestamp;
          lastGame = stats.last_game_at;
        }
      }
    });

    return lastGame;
  }

  private formatLastGame(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 30) {
      return date.toLocaleDateString('pt-BR');
    } else if (diffDays > 0) {
      return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'agora mesmo';
    }
  }

  private getRankLevel(points: number): string {
    if (points >= 1600) return 'Conquer 3';
    if (points >= 1500) return 'Conquer 2';
    if (points >= 1400) return 'Conquer 1';
    if (points >= 1350) return 'Diamante 3';
    if (points >= 1300) return 'Diamante 2';
    if (points >= 1200) return 'Diamante 1';
    if (points >= 1100) return 'Platina';
    if (points >= 900) return 'Ouro';
    if (points >= 700) return 'Prata';
    return 'Bronze';
  }

  private createExampleTeamPlayer(user: any, index: number): TeamPlayer {
    const points = 1200 + Math.random() * 400;
    const wins = 20 + Math.floor(Math.random() * 20);
    const losses = 10 + Math.floor(Math.random() * 15);
    const total = wins + losses;
    const winRate = Math.round((wins / total) * 100);

    return {
      rank: 0,
      name: `Player_${user.id}`,
      profile_url: user.aoe4_world_id
        ? `https://aoe4world.com/players/${user.aoe4_world_id}`
        : '#',
      global_rank: 1000 + index,
      season_rank_global: 1000 + index,
      rank_level: this.getRankLevel(points),
      points,
      elo: points + 50,
      win_rate: winRate,
      wins,
      losses,
      total_matches: total,
      last_game: 'há alguns dias',
      id: user.id,
      discord_user_id: user.discord_user_id,
      aoe4_world_id: user.aoe4_world_id,
      team_modes: {
        rm_2v2: {
          rating: points - 50,
          rank: index + 1000,
          max_rating: points,
          games_count: total,
          wins_count: wins,
          losses_count: losses,
          win_rate: winRate,
          last_game_at: new Date().toISOString(),
        },
      },
      preferred_team_mode: 'rm_2v2',
    };
  }
}

export const teamDatabase = new TeamDatabase();
