const teamDatabase = require('./database-team-game');

interface Player {
  rank: number;
  name: string;
  points: number;
  elo: number;
  win_rate: number;
  preferred_team_mode: string;
  global_rank: number;
  last_game: string;
}

async function getTeamGamePlayers(): Promise<Player[]> {
  try {
    console.log('🎮 Buscando jogadores para TEAM GAME...');
    const players = await teamDatabase.getPlayers();
    return players;
  } catch (error) {
    console.error('❌ Erro:', error);
    // Retorna dados de exemplo em caso de erro
    return [
      {
        rank: 1,
        name: "Aragorn_BR",
        points: 1720,
        elo: 1750,
        win_rate: 65,
        preferred_team_mode: "rm_4v4",
        global_rank: 1500,
        last_game: "há 2 horas"
      },
      {
        rank: 2,
        name: "Legolas_IV", 
        points: 1678,
        elo: 1700,
        win_rate: 62,
        preferred_team_mode: "rm_3v3",
        global_rank: 2100,
        last_game: "há 1 dia"
      }
    ];
  }
}

async function getTeamGameStats() {
  try {
    return await teamDatabase.getStats();
  } catch (error) {
    console.error('❌ Erro ao buscar stats:', error);
    return {
      totalPlayers: 2,
      totalWins: 94,
      highestPoints: 1720,
      totalExperts: 2
    };
  }
}

async function get4v4Players() {
  const players = await getTeamGamePlayers();
  return players.filter(p => p.preferred_team_mode === 'rm_4v4');
}

async function get3v3Players() {
  const players = await getTeamGamePlayers();
  return players.filter(p => p.preferred_team_mode === 'rm_3v3');
}

async function get2v2Players() {
  const players = await getTeamGamePlayers();
  return players.filter(p => p.preferred_team_mode === 'rm_2v2');
}

module.exports = {
  getTeamGamePlayers,
  getTeamGameStats,
  get4v4Players,
  get3v3Players,
  get2v2Players
};