'use client';

import { useEffect, useState } from 'react';

interface Player {
  id: number;
  name: string;
  rank: number;
  points: number;
  elo: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_matches: number;
  last_game: string;
  profile_url: string;
  rank_level: string;
  discord_user_id?: string;
  avatar_url?: string;
  mode?: string;
}

interface Stats {
  totalPlayers: number;
  totalWins: number;
  totalMatches: number;
  highestPoints: number;
  totalExperts: number;
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<string>('current');
  const [mode, setMode] = useState<string>('solo');

  useEffect(() => {
    loadLeaderboardData();
  }, [season, mode]);

  async function loadLeaderboardData() {
    try {
      setLoading(true);
      
      // Buscar dados da sua API real
      const [playersResponse, statsResponse] = await Promise.all([
        fetch(`/api/players?season=${season}&mode=${mode}`),
        fetch(`/api/stats?season=${season}&mode=${mode}`)
      ]);

      if (playersResponse.ok && statsResponse.ok) {
        const playersData = await playersResponse.json();
        const statsData = await statsResponse.json();
        
        setPlayers(playersData.players || playersData);
        setStats(statsData);
      } else {
        // Fallback para dados mockados se a API falhar
        console.log('API não disponível, usando dados mockados');
        loadMockData();
      }
    } catch (error) {
      console.error('Erro ao carregar dados da API:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  }

// No seu Leaderboard.tsx, adicione este debug
useEffect(() => {
  if (players.length > 0) {
    console.log('🔍 DEBUG - Dados dos players:', players.map(p => ({
      name: p.name,
      avatar_url: p.avatar_url,
      has_avatar: !!p.avatar_url
    })));
  }
}, [players]);

  function loadMockData() {
    const mockPlayers: Player[] = [
      {
        id: 1,
        name: "Player_BR_01",
        rank: 1,
        points: 1650,
        elo: 1650,
        wins: 45,
        losses: 22,
        win_rate: 67,
        total_matches: 67,
        last_game: "Hoje",
        profile_url: "https://aoe4world.com/players/1",
        rank_level: "Conqueror 1",
        discord_user_id: "player01",
        avatar_url: "https://aoe4world.com/images/avatars/official/1.png"
      },
      {
        id: 2,
        name: "Player_BR_02",
        rank: 2,
        points: 1580,
        elo: 1580,
        wins: 38,
        losses: 25,
        win_rate: 60,
        total_matches: 63,
        last_game: "Hoje",
        profile_url: "https://aoe4world.com/players/2",
        rank_level: "Diamond 3",
        discord_user_id: "player02",
        avatar_url: "https://aoe4world.com/images/avatars/official/2.png"
      },
      {
        id: 3,
        name: "Player_BR_03",
        rank: 3,
        points: 1720,
        elo: 1720,
        wins: 52,
        losses: 18,
        win_rate: 74,
        total_matches: 70,
        last_game: "Hoje",
        profile_url: "https://aoe4world.com/players/3",
        rank_level: "Conqueror 2",
        discord_user_id: "player03",
        avatar_url: "https://aoe4world.com/images/avatars/official/3.png"
      }
    ];

    const mockStats: Stats = {
      totalPlayers: 3,
      totalWins: 135,
      totalMatches: 200,
      highestPoints: 1720,
      totalExperts: 2
    };

    setPlayers(mockPlayers);
    setStats(mockStats);
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
        🐛 Leaderboard.tsx CARREGADO - {players.length} jogadores
      </div>
      

      
      <header>
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <div className="logo-icon">IV</div>
              <div className="logo-text">Age of Empires IV</div>
            </div>
            <div className="nav-links">
              <a href="#" className="active">Leaderboard</a>
              <a href="/clans">Clans</a>
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
          
          {/* Filtros */}
          <div className="filters">
            <select 
              value={season} 
              onChange={(e) => setSeason(e.target.value)}
              className="filter-select"
            >
              <option value="current">Season Atual</option>
              <option value="12">Season 12</option>
              <option value="11">Season 11</option>
            </select>
            
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value)}
              className="filter-select"
            >
              <option value="solo">1v1 Solo</option>
              <option value="team">Team</option>
            </select>
            
            <button 
              onClick={loadLeaderboardData}
              className="refresh-btn"
            >
              🔄 Atualizar
            </button>
          </div>
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
            <div className="stat-number">{stats?.highestPoints || '-'}</div>
            <div className="stat-label">Maior Rating</div>
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
              <div className="results-count">
                {players.length} jogadores encontrados
              </div>
            </div>
            
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="player-rank">#</th>
                  <th>Jogador</th>
                  <th>Rank</th>
                  <th>Rating</th>
                  <th>ELO</th>
                  <th>Vitórias</th>
                  <th>Win Rate</th>
                  <th>Última Partida</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => {
                  const isHighWinRate = player.win_rate >= 65;
                  
                  return (
                    <tr key={player.id}>
                      <td className="player-rank">{player.rank}</td>
<td>
  <div className="player-info">
    {/* SUBSTITUIR AVATAR POR INICIAIS */}
    <div className="player-avatar-modern">
      {player.name.charAt(0).toUpperCase()}
    </div>
    <div className="player-details">
      <a 
        href={player.profile_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="player-name-link"
      >
        <div className="player-name">{player.name}</div>
      </a>
      <div className="player-discord">
        {player.discord_user_id ? `@${player.discord_user_id}` : 'Sem Discord'}
      </div>
    </div>
  </div>
</td>
                      <td className="rank-level">
                        <span className={`badge ${player.rank_level.toLowerCase().replace(' ', '-')}`}>
                          {player.rank_level}
                        </span>
                      </td>
                      <td className="points">{player.points}</td>
                      <td className="elo">{player.elo}</td>
                      <td className="wins-losses">
                        {player.wins}W / {player.losses}L
                        <div className="matches-total">({player.total_matches} total)</div>
                      </td>
                      <td className={`win-rate ${isHighWinRate ? 'high' : ''}`}>
                        {player.win_rate}%
                      </td>
                      <td className="last-match">{player.last_game}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {players.length === 0 && (
              <div className="empty-state">
                <p>Nenhum jogador encontrado para os filtros selecionados.</p>
                <button onClick={loadMockData} className="btn">
                  Carregar Dados de Exemplo
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            <div className="discord-cta">
              <h3>🎮 Entre para nossa comunidade!</h3>
              <p>Conecte-se com outros jogadores brasileiros</p>
              <div className="discord-command">
                <code>/signup</code> no Discord
              </div>
              <a href="https://discord.gg/agebrasil" className="btn discord-btn">
                🎯 Junte-se ao Discord
              </a>
            </div>

            <div className="info-card">
              <h3><i className="fas fa-info-circle"></i> Como Participar</h3>
              <p>Use <code>/signup</code> no nosso Discord para entrar no ranking e começar a competir!</p>
            </div>

            <div className="info-card">
              <h3><i className="fas fa-chart-line"></i> Sobre os Dados</h3>
              <p>Dados atualizados automaticamente da API do AOE4 World. Atualizações a cada 24h.</p>
            </div>

            <div className="info-card">
              <h3><i className="fas fa-trophy"></i> Ranking System</h3>
              <p>Baseado no rating do AOE4 World. Conqueror: 1400+, Diamond: 1200-1399, Platinum: 1000-1199</p>
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
                <li><a href="https://aoe4world.com" target="_blank">AOE4 World</a></li>
                <li><a href="#">Civilizações</a></li>
                <li><a href="#">Estratégias</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Comunidade</h4>
              <ul>
                <li><a href="/clans">Clans Brasileiros</a></li>
                <li><a href="#">Torneios</a></li>
                <li><a href="https://discord.gg/agebrasil" target="_blank">Discord</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Desenvolvimento</h4>
              <ul>
                <li><a href="#">GitHub</a></li>
                <li><a href="#">API</a></li>
                <li><a href="#">Reportar Bug</a></li>
              </ul>
            </div>
          </div>
          
          <div className="copyright">
            &copy; 2024 Age of Empires IV Comunidade Brasileira. Dados providos por AOE4 World API.
          </div>
        </div>
      </footer>

      <style jsx>{`
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .filters {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
          flex-wrap: wrap;
        }
        
        .filter-select {
          padding: 0.5rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 0.9rem;
        }
        
        .refresh-btn {
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .player-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .player-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        
        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .player-details {
          min-width: 0;
        }
        
        .player-name {
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.25rem;
        }
        
        .player-name-link {
          text-decoration: none;
        }
        
        .player-name-link:hover .player-name {
          color: #667eea;
        }
        
        .player-discord {
          font-size: 0.8rem;
          color: #718096;
        }
        
        .rank-level .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .badge.conqueror-1,
        .badge.conqueror-2,
        .badge.conqueror-3 {
          background: #fbbf24;
          color: #78350f;
        }
        
        .badge.diamond-1,
        .badge.diamond-2,
        .badge.diamond-3 {
          background: #60a5fa;
          color: #1e3a8a;
        }
        
        .badge.platinum-1,
        .badge.platinum-2,
        .badge.platinum-3 {
          background: #a78bfa;
          color: #4c1d95;
        }
        
        .wins-losses {
          font-size: 0.9rem;
        }
        
        .matches-total {
          font-size: 0.75rem;
          color: #718096;
          margin-top: 0.25rem;
        }
        
        .win-rate.high {
          color: #10b981;
          font-weight: 600;
        }
        
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #718096;
        }
        
        .btn {
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          text-decoration: none;
          display: inline-block;
          cursor: pointer;
        }
        
        .discord-btn {
          background: #5865f2;
          width: 100%;
          text-align: center;
          margin-top: 1rem;
        }
        
        .discord-command {
          background: #2d3748;
          color: #e2e8f0;
          padding: 0.5rem;
          border-radius: 4px;
          font-family: monospace;
          margin: 0.5rem 0;
        }
        
        .section-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .results-count {
          color: #718096;
          font-size: 0.9rem;
        }
        
        /* Mantenha o resto do seu CSS existente */
      `}</style>
    </>
  );
}