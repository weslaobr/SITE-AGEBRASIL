const { Router } = require('express');
const { 
  getTeamGamePlayers, 
  getTeamGameStats, 
  get4v4Players, 
  get3v3Players, 
  get2v2Players 
} = require('../team-controller');

const router = Router();

// Rota principal
router.get('/team-players', async (req, res) => {
  try {
    const players = await getTeamGamePlayers();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar jogadores team game' });
  }
});

// Rota para estatísticas
router.get('/team-stats', async (req, res) => {
  try {
    const stats = await getTeamGameStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas team game' });
  }
});

// Rotas para modos específicos
router.get('/team/4v4', async (req, res) => {
  try {
    const players = await get4v4Players();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar jogadores 4v4' });
  }
});

router.get('/team/3v3', async (req, res) => {
  try {
    const players = await get3v3Players();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar jogadores 3v3' });
  }
});

router.get('/team/2v2', async (req, res) => {
  try {
    const players = await get2v2Players();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar jogadores 2v2' });
  }
});

module.exports = router;