// controller/database-team-game.ts
import sqlite3 from 'sqlite3';
import path from 'path';

// Ajuste o caminho do banco conforme sua estrutura
const dbPath = path.join('F:', 'Downloads', 'BOT-AGE-BRASIL', 'agebrasil.db');

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
  private db: sqlite3.Database;

  constructor() {
    console.log('🔌 Conectando ao banco para TEAM GAME (RM apenas)...');
    this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
  }

  async getPlayers(): Promise<TeamPlayer[]> {
    return new Promise((resolve, reject) => {
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
          reject(err);
        } else {
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
                  preferred_team_mode: teamData.preferred_team_mode
                });
                
                console.log(`📊 ${teamData.name}: Team Points ${teamData.points}, Preferred Mode: ${teamData.preferred_team_mode}`);
              }
              
            } catch (error) {
              console.log(`⚠️  Erro no usuário ${user.discord_user_id} para TEAM GAME, usando dados de exemplo`);
              players.push(this.createExampleTeamPlayer(user, players.length));
            }
          }
          
          players.sort((a, b) => b.points - a.points);
          players.forEach((player, index) => {
            player.rank = index + 1;
          });
          
          resolve(players);
        }
      });
    });
  }

  private async getTeamGameData(aoe4WorldId: string): Promise<any> {
    try {
      const response = await fetch(`https://aoe4world.com/api/v0/players/${aoe4WorldId}`);
      const data = await response.json();
      
      console.log(`\n🔍 Analisando player para TEAM GAME (RM): ${data.name || aoe4WorldId}`);
      
      const teamModes = {
        rm_2v2: this.extractTeamModeData(data, 'rm_2v2'),
        rm_3v3: this.extractTeamModeData(data, 'rm_3v3'),
        rm_4v4: this.extractTeamModeData(data, 'rm_4v4')
      };

      const preferredTeamMode = this.findPreferredTeamMode(teamModes);
      const preferredModeData = teamModes[preferredTeamMode as keyof typeof teamModes];
      
      const seasonRankGlobal = preferredModeData?.rank || 0;
      const pointsValue = preferredModeData?.rating || 1000;
      const eloValue = preferredModeData?.max_rating || pointsValue;
      const lastGameAt = this.findLastTeamGame(teamModes);
      
      let lastGameFormatted = "Nunca";
      let lastGameTimestamp = 0;

      if (lastGameAt) {
        const lastGameDate = new Date(lastGameAt);
        lastGameFormatted = this.formatLastGame(lastGameDate);
        lastGameTimestamp = lastGameDate.getTime();
      }

      console.log(`   🎯 Modo Preferido: ${preferredTeamMode}`);
      console.log(`   📊 Team Points: ${pointsValue}`);
      console.log(`   🕵️  Team ELO: ${eloValue}`);
      console.log(`   🌐 Season Rank: ${seasonRankGlobal}`);
      console.log(`   🕒 Última Partida: ${lastGameFormatted}`);

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
        preferred_team_mode: preferredTeamMode
      };
      
    } catch (error) {
      console.log(`❌ AOE4 World API falhou para ${aoe4WorldId}:`, error instanceof Error ? error.message : 'Unknown error');
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
      last_game_at: modeData?.last_game_at || ''
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

  private createExampleTeamPlayer(user: any, index: number): TeamPlayer {
    const exampleData = [
      { points: 1720, elo: 1750, wins: 52, losses: 18, name: "Aragorn_BR", season_rank_global: 1500, last_game: "há 2 horas", preferred_mode: "rm_4v4" },
      { points: 1678, elo: 1700, wins: 42, losses: 29, name: "Legolas_IV", season_rank_global: 2100, last_game: "há 1 dia", preferred_mode: "rm_3v3" },
      { points: 1673, elo: 1690, wins: 33, losses: 22, name: "Gandalf_GG", season_rank_global: 2200, last_game: "há 3 dias", preferred_mode: "rm_2v2" },
    ];
    
    const data = exampleData[index] || { 
      points: 1300 + Math.random() * 200, 
      elo: 1300 + Math.random() * 200,
      wins: 15 + Math.floor(Math.random() * 20), 
      losses: 10 + Math.floor(Math.random() * 15),
      name: `Player_${user.discord_user_id.substring(user.discord_user_id.length - 4)}`,
      season_rank_global: 10000 + Math.floor(Math.random() * 50000),
      last_game: "há " + (1 + Math.floor(Math.random() * 30)) + " dias",
      preferred_mode: ["rm_2v2", "rm_3v3", "rm_4v4"][Math.floor(Math.random() * 3)]
    };
    
    const wins = data.wins;
    const losses = data.losses;
    const total_matches = wins + losses;
    const win_rate = total_matches > 0 ? Math.round((wins / total_matches) * 100) : 0;
    
    return {
      rank: 0,
      name: data.name,
      profile_url: user.aoe4_world_id ? `https://aoe4world.com/players/${user.aoe4_world_id}` : '#',
      global_rank: data.season_rank_global,
      season_rank_global: data.season_rank_global,
      rank_level: this.getRankLevel(data.points),
      points: data.points,
      elo: data.elo,
      win_rate: win_rate,
      wins: wins,
      losses: losses,
      total_matches: total_matches,
      last_game: data.last_game,
      last_game_timestamp: Date.now() - (Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      id: user.id,
      discord_user_id: user.discord_user_id,
      aoe4_world_id: user.aoe4_world_id,
      team_modes: {
        rm_2v2: { rating: data.points - 50, rank: data.season_rank_global + 1000, max_rating: data.elo - 50, games_count: 25, wins_count: 15, losses_count: 10, win_rate: 60, last_game_at: new Date().toISOString() },
        rm_3v3: { rating: data.points, rank: data.season_rank_global, max_rating: data.elo, games_count: 30, wins_count: 18, losses_count: 12, win_rate: 60, last_game_at: new Date().toISOString() },
        rm_4v4: { rating: data.points + 20, rank: data.season_rank_global - 500, max_rating: data.elo + 20, games_count: 40, wins_count: 25, losses_count: 15, win_rate: 62, last_game_at: new Date().toISOString() }
      },
      preferred_team_mode: data.preferred_mode
    };
  }

  async getStats() {
    try {
      const players = await this.getPlayers();
      
      const totalPlayers = players.length;
      const totalWins = players.reduce((sum, player) => sum + player.wins, 0);
      const highestPoints = players.length > 0 ? Math.max(...players.map(p => p.points)) : 0;
      const totalExperts = players.filter(player => player.points >= 1400).length;

      const modeDistribution = this.calculateModeDistribution(players);
      const averageTeamSize = this.calculateAverageTeamSize(players);

      return {
        totalPlayers,
        totalWins,
        highestPoints,
        totalExperts,
        modeDistribution,
        averageTeamSize,
        teamGameModes: Object.keys(modeDistribution)
      };
    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas TEAM GAME:', error);
      throw error;
    }
  }

  private calculateModeDistribution(players: TeamPlayer[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    
    players.forEach(player => {
      const mode = player.preferred_team_mode;
      distribution[mode] = (distribution[mode] || 0) + 1;
    });
    
    return distribution;
  }

  private calculateAverageTeamSize(players: TeamPlayer[]): number {
    const modeSizes: { [key: string]: number } = {
      'rm_2v2': 2,
      'rm_3v3': 3,
      'rm_4v4': 4
    };
    
    let totalSize = 0;
    let count = 0;
    
    players.forEach(player => {
      const size = modeSizes[player.preferred_team_mode];
      if (size) {
        totalSize += size;
        count++;
      }
    });
    
    return count > 0 ? Math.round(totalSize / count) : 0;
  }

  async getPlayersByMode(mode: 'rm_2v2' | 'rm_3v3' | 'rm_4v4'): Promise<TeamPlayer[]> {
    const allPlayers = await this.getPlayers();
    
    return allPlayers
      .filter(player => player.team_modes && player.team_modes[mode] && player.team_modes[mode].rating > 0)
      .sort((a, b) => (b.team_modes?.[mode]?.rating || 0) - (a.team_modes?.[mode]?.rating || 0));
  }

  close() {
    this.db.close();
  }
}

export const teamDatabase = new TeamDatabase();