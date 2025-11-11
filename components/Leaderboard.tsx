'use client';

import { useEffect, useState } from 'react';

interface Player {
  id: number;
  name: string;
  rank: number;
  mode: string;
  civilization: string;
  elo: number;
  wins: number;
  losses: number;
  lastMatch: string;
  profile_url: string;
  discord_id?: string;
}

interface Stats {
  totalPlayers: number;
  totalWins: number;
  highestElo: number;
  totalExperts: number;
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboardData();
  }, []);


  
  async function loadLeaderboardData() {
    try {
      // Dados mockados - depois substitua pela sua API
      const mockData = {
        players: [
          {
            id: 1,
            name: "Player_BR_01",
            rank: 15,
            mode: "RM SOLO",
            civilization: "english",
            elo: 1650,
            wins: 45,
            losses: 22,
            lastMatch: "Hoje",
            profile_url: "https://aoe4world.com/players/1"
          },
          {
            id: 2,
            name: "Player_BR_02",
            rank: 28,
            mode: "RM TEAM",
            civilization: "French",
            elo: 1580,
            wins: 38,
            losses: 25,
            lastMatch: "Hoje",
            profile_url: "https://aoe4world.com/players/2"
          },
          {
            id: 3,
            name: "Player_BR_03",
            rank: 8,
            mode: "RM SOLO",
            civilization: "mongols",
            elo: 1720,
            wins: 52,
            losses: 18,
            lastMatch: "Hoje",
            profile_url: "https://aoe4world.com/players/3"
          }
        ],
        stats: {
          totalPlayers: 3,
          totalWins: 135,
          highestElo: 1720,
          totalExperts: 3
        }
      };

      setPlayers(mockData.players);
      setStats(mockData.stats);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Carregando dados do ranking...</p>
      </div>
    );
  }

return (
  <>
    {/* DEBUG - Remova depois */}
    <div style={{
      position: 'fixed', 
      top: '10px', 
      left: '10px', 
      background: 'red', 
      color: 'white', 
      padding: '10px', 
      zIndex: 9999
    }}>
      🐛 Leaderboard.tsx CARREGADO
    </div>
    
    {/* Seu conteúdo normal */}
    <header>
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <div className="logo-icon">IV</div>
              <div className="logo-text">Age of Empires IV</div>
            </div>
            <div className="nav-links">
              <a href="#">Leaderboard</a>
              <a href="#">Estatísticas</a>
              <a href="#">Torneios</a>
              <a href="#">Comunidade</a>
              <a href="#">Sobre</a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>Comunidade Brasileira de Age of Empires IV</h1>
          <p>A maior plataforma de rankings e estatísticas de Age of Empires IV do Brasil</p>
        </div>
      </section>



      {/* Stats Overview */}
      <div className="container">
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-number">{stats?.totalPlayers || '-'}</div>
            <div className="stat-label">Jogadores</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats?.totalWins || '-'}</div>
            <div className="stat-label">Vitórias</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats?.highestElo || '-'}</div>
            <div className="stat-label">Maior ELO</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats?.totalExperts || '-'}</div>
            <div className="stat-label">Experts</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container">
        <div className="main-content">
          {/* Leaderboard Section */}
          <div className="leaderboard-section">
            <div className="section-header">
              <h2><i className="fas fa-trophy"></i> Ranking Brasileiro</h2>
            </div>
            
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="player-rank">#</th>
                  <th>Jogador</th>
                  <th>Civilização</th>
                  <th>ELO</th>
                  <th>Vitórias</th>
                  <th>Win Rate</th>
                  <th>Última Partida</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => {
                  const winRate = Math.round((player.wins / (player.wins + player.losses)) * 100);
                  const isHighWinRate = winRate >= 65;
                  
                  return (
                    <tr key={player.id}>
                      <td className="player-rank">{index + 1}</td>
<td>
  <div className="player-info">
    <div className="player-avatar">
      {player.name.charAt(0).toUpperCase()}
    </div>
    <div>
      <a 
        href={player.profile_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="player-name-link"
      >
        <div className="player-name">{player.name}</div>
      </a>
      <div className="player-details">@{player.discord_id}</div>
    </div>
  </div>
</td>
                      <td className="civilization">{player.civilization}</td>
                      <td className="elo">{player.elo}</td>
                      <td>{player.wins}W/{player.losses}L</td>
                      <td className={`win-rate ${isHighWinRate ? 'high' : ''}`}>
                        {winRate}%
                      </td>
                      <td className="last-match">{player.lastMatch}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            <div className="discord-cta">
              <p>Entre para nossa comunidade no Discord!</p>
              <div className="command">/signup</div>
              <a href="https://discord.gg/seu-convite" className="btn">
                Junte-se ao Discord
              </a>
            </div>

            <div className="info-card">
              <h3><i className="fas fa-info-circle"></i> Como Participar</h3>
              <p>Use /signup no Discord para entrar no ranking e começar a competir com outros jogadores brasileiros de Age of Empires IV.</p>
            </div>

            <div className="info-card">
              <h3><i className="fas fa-chart-line"></i> Estatísticas</h3>
              <p>Dados atualizados da API do AOE4 World. Todas as informações são atualizadas automaticamente conforme as partidas são registradas.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-content">
            <div className="footer-column">
              <h4>Age of Empires IV</h4>
              <ul>
                <li><a href="#">Sobre o Jogo</a></li>
                <li><a href="#">Civilizações</a></li>
                <li><a href="#">Estratégias</a></li>
                <li><a href="#">Notícias</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Comunidade</h4>
              <ul>
                <li><a href="#">Leaderboards</a></li>
                <li><a href="#">Torneios</a></li>
                <li><a href="#">Fóruns</a></li>
                <li><a href="https://discord.gg/seu-convite">Discord</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Recursos</h4>
              <ul>
                <li><a href="#">Guia para Iniciantes</a></li>
                <li><a href="#">Build Orders</a></li>
                <li><a href="#">Estatísticas Detalhadas</a></li>
                <li><a href="#">API</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Suporte</h4>
              <ul>
                <li><a href="#">Contato</a></li>
                <li><a href="#">FAQ</a></li>
                <li><a href="#">Reportar Problema</a></li>
                <li><a href="#">Política de Privacidade</a></li>
              </ul>
            </div>
          </div>
          
          <div className="copyright">
            &copy; 2023 Age of Empires IV Comunidade Brasileira. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </>
  );
}