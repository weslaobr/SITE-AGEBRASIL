'use client';

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import StreamSection from '../components/StreamSection';
import TournamentSection from '../components/TournamentSection';

interface Player {
  rank: number;
  name: string;
  profile_url: string;
  global_rank: number;
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

interface Clan {
  id: number;
  name: string;
  tag: string;
  leader_id: number;
  total_members: number;
  average_elo: number;
  total_points: number;
  rank: number;
  description?: string;
  active_players?: number;
}

interface ClanMember {
  id: number;
  name: string;
  aoe4_world_id: string;
  profile_url: string;
  rank_level: string;
  points: number;
  elo: number;
  win_rate: number;
  wins: number;
  losses: number;
  role?: string;
}

interface ClanWithMembers extends Clan {
  members?: ClanMember[];
  expanded?: boolean;
}

interface Stats {
  totalPlayers: number;
  totalWins: number;
  highestPoints: number;
  totalExperts: number;
}

interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [clansWithMembers, setClansWithMembers] = useState<ClanWithMembers[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<string>('current');
  const [selectedMode, setSelectedMode] = useState<string>('solo');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeTab, setActiveTab] = useState<'players' | 'clans'>('players');
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingClanMembers, setLoadingClanMembers] = useState<number | null>(null);

  const DISCORD_INVITE_URL = 'https://discord.gg/GGP8Kg4HHN';

  const gameModes = [
    { id: 'solo', name: 'Solo Ranked' },
    { id: 'team', name: 'Team Ranked' }
  ];

  const loadClanMembers = async (clanId: number) => {
    try {
      setLoadingClanMembers(clanId);
      
      const response = await fetch(`/api/clans/${clanId}/members`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.members) {
          setClansWithMembers(prev => prev.map(clan => 
            clan.id === clanId 
              ? { ...clan, members: data.members, expanded: !clan.expanded }
              : { ...clan, expanded: false }
          ));
        } else {
          console.warn('API não retornou membros válidos');
        }
      } else {
        throw new Error('Erro ao carregar membros da API');
      }
    } catch (error) {
      console.error('Erro ao carregar membros do clan:', error);
    } finally {
      setLoadingClanMembers(null);
    }
  };

  const toggleClanExpansion = (clanId: number) => {
    const clan = clansWithMembers.find(c => c.id === clanId);
    
    if (clan?.members) {
      setClansWithMembers(prev => prev.map(clan => 
        clan.id === clanId 
          ? { ...clan, expanded: !clan.expanded }
          : clan
      ));
    } else {
      loadClanMembers(clanId);
    }
  };

  const loadLeaderboardData = useCallback(async () => {
    try {
      console.log(`🎯 Carregando dados - Modo: ${selectedMode}, Temporada: ${selectedSeason}`);
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        season: selectedSeason,
        mode: selectedMode
      });

      const [leaderboardResponse, clansResponse] = await Promise.allSettled([
        fetch(`/api/leaderboard?${params}`),
        fetch('/api/clans')
      ]);

      if (leaderboardResponse.status === 'fulfilled' && leaderboardResponse.value.ok) {
        const data = await leaderboardResponse.value.json();
        setStats(data.stats);
        setPlayers(data.players);
        console.log(`✅ Dados recebidos: ${data.players.length} jogadores`);
      } else {
        throw new Error('Erro ao carregar dados do leaderboard');
      }

      if (clansResponse.status === 'fulfilled' && clansResponse.value.ok) {
        const clansData = await clansResponse.value.json();
        setClans(clansData.clans || []);
        console.log(`✅ Clans recebidos: ${clansData.clans?.length || 0} clans`);
      } else {
        console.log('ℹ️  Dados de clans não disponíveis');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setError('Erro ao carregar dados do ranking. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [selectedMode, selectedSeason]);

  useEffect(() => {
    console.log('🚀 Iniciando aplicação...');
    
    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const initializeApp = async () => {
      try {
        setError(null);
        setLoadingSeasons(true);
        
        const seasonsResponse = await fetch('/api/seasons');
        if (seasonsResponse.ok && mounted) {
          const seasonsData = await seasonsResponse.json();
          if (seasonsData.success) {
            setSeasons(seasonsData.seasons);
            console.log(`✅ ${seasonsData.seasons.length} temporadas carregadas`);
          }
        }
        
        if (mounted) {
          await loadLeaderboardData();
        }
        
        if (mounted) {
          intervalId = setInterval(() => {
            loadLeaderboardData();
          }, 300000);
        }
        
      } catch (error) {
        console.error('Erro ao inicializar app:', error);
        if (mounted) {
          setError('Erro ao carregar dados iniciais.');
        }
      } finally {
        if (mounted) {
          setLoadingSeasons(false);
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loadLeaderboardData]);

  useEffect(() => {
    const filtered = searchTerm 
      ? players.filter(player =>
          player.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : players;
    
    setFilteredPlayers(filtered);
  }, [players, searchTerm]);

  useEffect(() => {
    if (clans.length > 0) {
      setClansWithMembers(clans.map(clan => ({ ...clan, expanded: false })));
    }
  }, [clans]);

  const getRankLevelColor = (level: string): string => {
    const colorMap: { [key: string]: string } = {
      'Conquer 3': '#ff3535ff',
      'Conquer 2': '#f75e26ff', 
      'Conquer 1': '#FF6B35',
      'Diamante 3': '#4CC9F0',
      'Diamante 2': '#4CC9F0',
      'Diamante 1': '#4CC9F0',
      'Platina 3': '#E5E4E2',
      'Platina 2': '#E5E4E2',
      'Platina 1': '#E5E4E2',
      'Ouro 3': '#FFD700',
      'Ouro 2': '#FFD700',
      'Ouro 1': '#FFD700',
      'Prata 3': '#C0C0C0',
      'Prata 2': '#C0C0C0',
      'Prata 1': '#C0C0C0',
      'Bronze 3': '#CD7F32',
      'Bronze 2': '#CD7F32',
      'Bronze 1': '#CD7F32'
    };
    return colorMap[level] || '#666';
  };




  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>AOE4 Brasil - Leaderboard</title>
          <link rel="icon" href="https://i.imgur.com/gLHqsWk.png" />
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white text-lg font-medium">Carregando ranking...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>AOE4 Brasil - Leaderboard</title>
          <link rel="icon" href="https://i.imgur.com/gLHqsWk.png" />
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <p className="text-white text-lg mb-4">{error}</p>
            <button 
              onClick={loadLeaderboardData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>AOE4 Brasil - Leaderboard Competitivo</title>
        <meta name="description" content="Comunidade Brasileira de Age of Empires IV - Ranking e Estatísticas" />
        <link rel="icon" href="https://i.imgur.com/gLHqsWk.png" />
      </Head>

      {/* Header Moderno */}
      <header className="site-header-modern">
        <div className="container">
          <div className="header-content-modern">
            <div className="logo-modern">
              <div className="logo-icon">
                <span>⚔️</span>
              </div>
              <div className="logo-text-modern">
                <h1 className="logo-title-modern">Age of Empires IV</h1>
                <p className="logo-subtitle-modern">Brasil</p>
              </div>
            </div>
            
            <nav className="nav-modern">
              <a href="https://aoe4world.com/leaderboard/rm_solo" className="nav-link-modern">
                <span className="nav-icon">🏆</span>
                <span className="nav-text">Ranking Global</span>
              </a>

              <a href="https://aoe4world.com/esports/tournaments" className="nav-link-modern">
                <span className="nav-icon">🎯</span>
                <span className="nav-text">Torneios</span>
              </a>

              <a href= {DISCORD_INVITE_URL} className="nav-link-modern">
                <span className="nav-icon">🎮</span>
                <span className="nav-text">Discord</span>
              </a>

            </nav>
          </div>
        </div>
      </header>

{/* Hero Section Moderna */}
<section className="hero-modern">
  <div className="container">
    <div className="hero-content">
      <div className="hero-text">
        <h1 className="hero-title">
          <span className="hero-title-main">Comunidade Brasileira</span>
          <span className="hero-title-accent">Age of Empires IV</span>
        </h1>
        <p className="hero-description">
          A maior plataforma de rankings e estatísticas competitivas de Age of Empires IV do Brasil
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="stat-number">{stats?.totalPlayers || 0}+</div>
            <div className="stat-label">Jogadores Ativos</div>
          </div>
          <div className="hero-stat">
            <div className="stat-number">{stats?.totalWins || 0}+</div>
            <div className="stat-label">Partidas Disputadas</div>
          </div>
          <div className="hero-stat">
            <div className="stat-number">{stats?.totalExperts || 0}+</div>
            <div className="stat-label">Conquers</div>
          </div>
        </div>
      </div>
      <div className="hero-visual">
        {/* Card do 1º lugar - usa dados reais */}
        {players.length > 0 && players[0] && (
          <div className="floating-card rank-1">
            <div className="card-header">
              <span className="rank-badge">🥇</span>
              <span className="player-name">
                {players[0].name.length > 12 
                  ? players[0].name.substring(0, 12) + '...' 
                  : players[0].name
                }
              </span>
            </div>
            <div className="card-stats">
              <span className="stat">ELO: {players[0].elo}</span>
              <span className="stat">WR: {players[0].win_rate}%</span>
            </div>
          </div>
        )}
        
        {/* Card do 2º lugar - usa dados reais */}
        {players.length > 1 && players[1] && (
          <div className="floating-card rank-2">
            <div className="card-header">
              <span className="rank-badge">🥈</span>
              <span className="player-name">
                {players[1].name.length > 12 
                  ? players[1].name.substring(0, 12) + '...' 
                  : players[1].name
                }
              </span>
            </div>
            <div className="card-stats">
              <span className="stat">ELO: {players[1].elo}</span>
              <span className="stat">WR: {players[1].win_rate}%</span>
            </div>
          </div>
        )}
        
        {/* Card do 3º lugar - usa dados reais */}
        {players.length > 2 && players[2] && (
          <div className="floating-card rank-3">
            <div className="card-header">
              <span className="rank-badge">🥉</span>
              <span className="player-name">
                {players[2].name.length > 12 
                  ? players[2].name.substring(0, 12) + '...' 
                  : players[2].name
                }
              </span>
            </div>
            <div className="card-stats">
              <span className="stat">ELO: {players[2].elo}</span>
              <span className="stat">WR: {players[2].win_rate}%</span>
            </div>
          </div>
        )}
        
        {/* Fallback caso não tenha jogadores suficientes */}
        {players.length === 0 && (
          <>
            <div className="floating-card rank-1">
              <div className="card-header">
                <span className="rank-badge">🥇</span>
                <span className="player-name">Top Player</span>
              </div>
              <div className="card-stats">
                <span className="stat">ELO: 1500</span>
                <span className="stat">WR: 60%</span>
              </div>
            </div>
            <div className="floating-card rank-2">
              <div className="card-header">
                <span className="rank-badge">🥈</span>
                <span className="player-name">Competitor</span>
              </div>
              <div className="card-stats">
                <span className="stat">ELO: 1400</span>
                <span className="stat">WR: 55%</span>
              </div>
            </div>
            <div className="floating-card rank-3">
              <div className="card-header">
                <span className="rank-badge">🥉</span>
                <span className="player-name">Challenger</span>
              </div>
              <div className="card-stats">
                <span className="stat">ELO: 1300</span>
                <span className="stat">WR: 50%</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
  
  {/* Wave Divider */}
  <div className="wave-divider">
    <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
      <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="shape-fill"></path>
    </svg>
  </div>
</section>

      {/* Streams e Torneios */}
      <StreamSection />

      {/* Filtros Modernos */}
      <div className="container">
        <div className="filters-section-modern">
          <div className="filters-grid-modern">
            <div className="filter-group-modern">
              <label htmlFor="player-search" className="filter-label">Buscar Jogador</label>
              <div className="search-input-wrapper-modern">
                <span className="search-icon-modern">🔍</span>
                <input
                  id="player-search"
                  type="text"
                  placeholder="Digite o nome do jogador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-modern"
                />
                {searchTerm && (
                  <button 
                    className="clear-search-modern"
                    onClick={() => setSearchTerm('')}
                    aria-label="Limpar busca"
                  >
                    <span>✕</span>
                  </button>
                )}
              </div>
            </div>

            <div className="filter-group-modern">
              <label htmlFor="season-select" className="filter-label">Temporada</label>
              <select
                id="season-select"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="filter-select-modern"
              >
                <option value="current">Temporada Atual</option>
                {seasons.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name} {season.is_current && '(Atual)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group-modern">
              <label htmlFor="mode-select" className="filter-label">Modo de Jogo</label>
              <select
                id="mode-select"
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="filter-select-modern"
              >
                {gameModes.map(mode => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group-modern">
              <label className="filter-label invisible">Atualizar</label>
              <button 
                onClick={loadLeaderboardData}
                className="refresh-button-modern"
                title="Atualizar dados"
                disabled={loading}
              >
                <span className={`refresh-icon ${loading ? 'spinning' : ''}`}>🔄</span>
                {loading ? 'Carregando...' : 'Atualizar'}
              </button>
            </div>
          </div>

          {searchTerm && (
            <div className="search-results-info-modern">
              <p>
                {filteredPlayers.length} jogador(es) encontrado(s) para "{searchTerm}"
                {filteredPlayers.length !== players.length && 
                  ` (de ${players.length} no total)`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="container">
        <div className="stats-overview-modern">
          <div className="stat-card-modern">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number-modern">{stats?.totalPlayers || 0}</div>
              <div className="stat-label-modern">Jogadores</div>
            </div>
          </div>
          <div className="stat-card-modern">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-number-modern">{stats?.totalWins || 0}</div>
              <div className="stat-label-modern">Vitórias</div>
            </div>
          </div>
          <div className="stat-card-modern">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <div className="stat-number-modern">{stats?.highestPoints || 0}</div>
              <div className="stat-label-modern">Maior Points</div>
            </div>
          </div>
          <div className="stat-card-modern">
            <div className="stat-icon">🚀</div>
            <div className="stat-content">
              <div className="stat-number-modern">{stats?.totalExperts || 0}</div>
              <div className="stat-label-modern">Conquers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="container">
        <div className="tabs-section-modern">
          <div className="tabs-modern">
            <button 
              className={`tab-modern ${activeTab === 'players' ? 'active' : ''}`}
              onClick={() => setActiveTab('players')}
            >
              <span className="tab-icon">👤</span>
              <span className="tab-text">Ranking de Jogadores</span>
              <span className="tab-badge-modern">{players.length}</span>
            </button>
            <button 
              className={`tab-modern ${activeTab === 'clans' ? 'active' : ''}`}
              onClick={() => setActiveTab('clans')}
            >
              <span className="tab-icon">🏰</span>
              <span className="tab-text">Ranking de Clans</span>
              <span className="tab-badge-modern">{clans.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="container">
        <div className="main-content-modern">
          {activeTab === 'players' && (
            <div className="leaderboard-section-modern">
              <div className="section-header-modern">
                <h2>
                  <span className="section-icon">🏆</span>
                  Ranking Brasileiro - {gameModes.find(m => m.id === selectedMode)?.name}
                </h2>

              </div>
              
              <div className="table-container-modern">
                <table className="leaderboard-table-modern">
                  <thead>
                    <tr>
                      <th className="rank-header">#</th>
                      <th className="player-header">Jogador</th>
                      <th className="global-header">Global Rank</th>
                      <th className="level-header">Nível</th>
                      <th className="points-header">Points</th>
                      <th className="elo-header">ELO</th>
                      <th className="winrate-header">Win Rate</th>
                      <th className="matches-header">Partidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.slice(0, 100).map((player) => {
                      const isHighWinRate = player.win_rate >= 60;
                      const isTopRank = player.rank <= 3;
                      
                      return (
                        <tr key={`${player.id}-${player.mode}`} className="player-row">
                          <td className="rank-cell">
                            <div className={`rank-badge-modern ${isTopRank ? 'top-rank' : ''}`}>
                              {getRankBadge(player.rank)}
                            </div>
                          </td>
                          <td className="player-cell">
                            <div className="player-info-modern">
                              <div className="player-avatar-modern">
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="player-details">
                                <a 
                                  href={player.profile_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="player-name-modern"
                                >
                                  {player.name}
                                </a>
                                <div className="player-matches">
                                  {player.total_matches} partidas
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="global-cell">
                            {player.global_rank > 0 ? `#${player.global_rank.toLocaleString()}` : '-'}
                          </td>
                          <td className="level-cell">
                            <span 
                              className="level-badge-modern"
                              style={{ backgroundColor: getRankLevelColor(player.rank_level) }}
                            >
                              {player.rank_level}
                            </span>
                          </td>
                          <td className="points-cell">
                            <strong>{player.points}</strong>
                          </td>
                          <td className="elo-cell">
                            {player.elo}
                          </td>
                          <td className={`winrate-cell ${isHighWinRate ? 'high-winrate' : ''}`}>
                            <div className="winrate-container">
                              <span className="winrate-value">{player.win_rate}%</span>
                              <div className="winrate-bar">
                                <div 
                                  className="winrate-progress"
                                  style={{ width: `${Math.min(player.win_rate, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="matches-cell">
                            <div className="matches-result">
                              <span className="wins">{player.wins}W</span>
                              <span className="losses">{player.losses}L</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredPlayers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="no-results-modern">
                          <div className="no-results-content-modern">
                            <span className="no-results-icon">🔍</span>
                            <p className="no-results-text">Nenhum jogador encontrado</p>
                            {searchTerm && (
                              <button 
                                onClick={() => setSearchTerm('')}
                                className="clear-filters-btn-modern"
                              >
                                Limpar busca
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredPlayers.length > 100 && (
                <div className="table-footer-modern">
                  <p>Mostrando os 100 primeiros de {filteredPlayers.length} jogadores</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'clans' && (
            <div className="clans-section-modern">
              <div className="section-header-modern">
                <h2>
                  <span className="section-icon">🏰</span>
                  Ranking de Clans Brasileiros
                </h2>
              
              </div>
              
              {clansWithMembers.length > 0 ? (
                <>
                  <div className="clan-stats-modern">
                    <div className="stat-card-modern">
                      <div className="stat-icon">🏰</div>
                      <div className="stat-content">
                        <div className="stat-number-modern">{clansWithMembers.length}</div>
                        <div className="stat-label-modern">Clans</div>
                      </div>
                    </div>
                    <div className="stat-card-modern">
                      <div className="stat-icon">👥</div>
                      <div className="stat-content">
                        <div className="stat-number-modern">
                          {clansWithMembers.reduce((sum, clan) => sum + (clan.total_members || 0), 0)}
                        </div>
                        <div className="stat-label-modern">Membros</div>
                      </div>
                    </div>
                    <div className="stat-card-modern">
                      <div className="stat-icon">⚡</div>
                      <div className="stat-content">
                        <div className="stat-number-modern">
                          {clansWithMembers.reduce((sum, clan) => sum + (clan.active_players || 0), 0)}
                        </div>
                        <div className="stat-label-modern">Ativos</div>
                      </div>
                    </div>
                    <div className="stat-card-modern">
                      <div className="stat-icon">⭐</div>
                      <div className="stat-content">
                        <div className="stat-number-modern">
                          {Math.max(...clansWithMembers.map(clan => clan.total_points || 0))}
                        </div>
                        <div className="stat-label-modern">Maior Points</div>
                      </div>
                    </div>
                  </div>

                  <div className="table-container-modern">
                    <table className="leaderboard-table-modern clans-table-modern">
                      <thead>
                        <tr>
                          <th className="rank-header">#</th>
                          <th className="clan-header">Clan</th>
                          <th className="tag-header">Tag</th>
                          <th className="members-header">Membros</th>
                          <th className="active-header">Ativos</th>
                          <th className="elo-header">ELO Médio</th>
                          <th className="points-header">Total Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clansWithMembers.map((clan) => (
                          <>
                            <tr 
                              key={clan.id} 
                              className={`clan-row-modern ${clan.expanded ? 'expanded' : ''}`}
                              onClick={() => toggleClanExpansion(clan.id)}
                            >
                              <td className="rank-cell">
                                <div className="clan-rank-badge">{clan.rank}</div>
                              </td>
                              <td className="clan-cell">
                                <div className="clan-info-modern">
                                  <div className="clan-avatar-modern">
                                    🏰
                                  </div>
                                  <div className="clan-details">
                                    <div className="clan-name-modern">
                                      {clan.name}
                                      <span className={`expansion-arrow ${clan.expanded ? 'expanded' : ''}`}>
                                        ▼
                                      </span>
                                    </div>
                                    {clan.description && clan.description !== 'Sem descrição' && (
                                      <div className="clan-description">{clan.description}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="tag-cell">
                                <span className="clan-tag-modern">[{clan.tag}]</span>
                              </td>
                              <td className="members-cell">{clan.total_members}</td>
                              <td className="active-cell">
                                <span className={clan.active_players > 0 ? 'active-high' : ''}>
                                  {clan.active_players || 0}
                                </span>
                              </td>
                              <td className="elo-cell">{Math.round(clan.average_elo)}</td>
                              <td className="points-cell"><strong>{clan.total_points}</strong></td>
                            </tr>
                            
                            {clan.expanded && (
                              <tr className="clan-members-row-modern">
                                <td colSpan={7}>
                                  <div className="clan-members-container-modern">
                                    {loadingClanMembers === clan.id ? (
                                      <div className="loading-members-modern">
                                        <div className="spinner-small"></div>
                                        <span>Carregando membros...</span>
                                      </div>
                                    ) : clan.members && clan.members.length > 0 ? (
                                      <>
                                        <h4 className="members-title">
                                          <span className="members-icon">👥</span>
                                          Membros do Clan ({clan.members.length})
                                        </h4>
                                        <div className="members-grid-modern">
                                          {clan.members.map((member) => (
                                            <div key={member.id} className="member-card-modern">
                                              <div className="member-header-modern">
                                                <div className="member-avatar-modern">
                                                  {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="member-info-modern">
                                                  <a 
                                                    href={member.profile_url}
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="member-name-modern"
                                                  >
                                                    {member.name}
                                                  </a>
                                                  {member.role && (
                                                    <div className="member-role-modern">{member.role}</div>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              <div className="member-stats-modern">
                                                <div className="member-stat-item">
                                                  <span className="member-stat-label">Rank:</span>
                                                  <span 
                                                    className="member-rank-badge"
                                                    style={{ backgroundColor: getRankLevelColor(member.rank_level || 'Unranked') }}
                                                  >
                                                    {member.rank_level || 'Unranked'}
                                                  </span>
                                                </div>
                                                <div className="member-stat-item">
                                                  <span className="member-stat-label">ELO:</span>
                                                  <span className="member-stat-value">{member.elo || 0}</span>
                                                </div>
                                                <div className="member-stat-item">
                                                  <span className="member-stat-label">Points:</span>
                                                  <span className="member-stat-value">
                                                    {member.points !== undefined ? member.points : 'N/A'}
                                                  </span>
                                                </div>
                                                <div className="member-stat-item">
                                                  <span className="member-stat-label">Win Rate:</span>
                                                  <span className={`member-stat-value ${(member.win_rate || 0) >= 60 ? 'high-winrate' : ''}`}>
                                                    {member.win_rate !== undefined ? `${member.win_rate}%` : 'N/A'}
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              <a 
                                                href={member.profile_url}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="aoe4world-link-modern"
                                              >
                                                <span className="link-icon">🔗</span>
                                                Ver no AOE4 World
                                              </a>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="no-members-modern">
                                        <span className="no-members-icon">👥</span>
                                        <p>Nenhum membro encontrado</p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="no-clans-message-modern">
                  <span className="no-clans-icon">🏰</span>
                  <h3>Ranking de Clans em Desenvolvimento</h3>
                  <p>Estamos trabalhando para trazer o ranking de clans em breve!</p>
                  <a href={DISCORD_INVITE_URL} className="discord-btn-large-modern" target="_blank" rel="noopener noreferrer">
                    <span className="discord-icon">🎮</span>
                    Discord da Comunidade
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Moderno */}
      <footer className="modern-footer">
        <div className="container">
          <div className="footer-main-modern">
            <div className="footer-section-modern">
              <div className="section-header-modern">
                <span className="section-icon">🎮</span>
                <h3>Como Participar</h3>
              </div>
              <div className="discord-cta-modern">
                <p>Entre para nossa comunidade no Discord e use o comando:</p>
                <div className="command-box-modern">
                  <code>/signup</code>
                  <button className="copy-btn-modern" title="Copiar comando">
                    <span>📋</span>
                  </button>
                </div>
                <p>para entrar no ranking e competir com jogadores brasileiros!</p>
                <a href={DISCORD_INVITE_URL} className="discord-btn-large-modern" target="_blank" rel="noopener noreferrer">
                  <span className="discord-icon">🎮</span>
                  Entrar no Discord
                </a>
              </div>
            </div>

            <div className="footer-section-modern">
              <div className="section-header-modern">
                <span className="section-icon">📊</span>
                <h3>Sistema de Ranqueamento</h3>
              </div>
              <div className="ranking-system-modern">
                <div className="rank-item-modern">
                  <div className="rank-icon-modern">
                    <span>⭐</span>
                  </div>
                  <div className="rank-info-modern">
                    <strong>Points</strong>
                    <span>Rating baseado em performance</span>
                  </div>
                </div>
                <div className="rank-item-modern">
                  <div className="rank-icon-modern">
                    <span>♟️</span>
                  </div>
                  <div className="rank-info-modern">
                    <strong>ELO</strong>
                    <span>Ranked Matchmaking Rating</span>
                  </div>
                </div>
                <div className="rank-item-modern">
                  <div className="rank-icon-modern">
                    <span>🔄</span>
                  </div>
                  <div className="rank-info-modern">
                    <strong>Atualização</strong>
                    <span>Dados via AOE4 World API</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="footer-section-modern">
              <div className="section-header-modern">
                <span className="section-icon">🎯</span>
                <h3>Modos de Jogo</h3>
              </div>
              <div className="game-modes-grid-modern">
                <div className="mode-card-modern featured">
                  <div className="mode-icon-modern">
                    <span>👤</span>
                  </div>
                  <div className="mode-content-modern">
                    <h4>Solo Ranked</h4>
                    <p>Partidas solo</p>
                    <span className="mode-stats-modern">+{players.filter(p => p.mode === 'solo').length} jogadores</span>
                  </div>
                </div>
                <div className="mode-card-modern">
                  <div className="mode-icon-modern">
                    <span>👥</span>
                  </div>
                  <div className="mode-content-modern">
                    <h4>Team Ranked</h4>
                    <p>Partidas em equipe</p>
                    <span className="mode-stats-modern">2v2, 3v3, 4v4</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="footer-section-modern">
              <div className="section-header-modern">
                <span className="section-icon">🔗</span>
                <h3>Links Rápidos</h3>
              </div>
              <div className="quick-links-grid-modern">
                <a href={DISCORD_INVITE_URL} className="quick-link-modern discord" target="_blank" rel="noopener noreferrer">
                  <span className="link-icon">💬</span>
                  <span>Discord</span>
                </a>
                <a href="/stats" className="quick-link-modern">
                  <span className="link-icon">📈</span>
                  <span>Estatísticas</span>
                </a>
                <a href="/tournaments" className="quick-link-modern">
                  <span className="link-icon">🏆</span>
                  <span>Torneios</span>
                </a>
                <a href="/community" className="quick-link-modern">
                  <span className="link-icon">👥</span>
                  <span>Comunidade</span>
                </a>
              </div>
            </div>
          </div>

          <div className="footer-bottom-modern">
            <div className="copyright-modern">
              <div className="footer-logo-modern">
                <div className="logo-icon-small">⚔️</div>
                <span>WESLÃO DEV. - AGE OF EMPIRES IV BRASIL</span>
              </div>
              <p>&copy; 2025 Comunidade Brasileira. Todos os direitos reservados.</p>
            </div>
            <div className="social-links-modern">
              <a href="#" className="social-link-modern">
                <span>🐦</span>
              </a>
              <a href="#" className="social-link-modern">
                <span>📺</span>
              </a>
              <a href={DISCORD_INVITE_URL} className="social-link-modern">
                <span>🎮</span>
              </a>
              <a href="#" className="social-link-modern">
                <span>💻</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        /* Reset e configurações globais */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        /* Header Moderno */
        .site-header-modern {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
          padding: 1rem 0;
        }

        .header-content-modern {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-modern {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .logo-text-modern {
          display: flex;
          flex-direction: column;
        }

        .logo-title-modern {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          line-height: 1;
        }

        .logo-subtitle-modern {
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0;
          font-weight: 500;
        }

        .nav-modern {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .nav-link-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #cbd5e1;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .nav-link-modern:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }

        .nav-icon {
          font-size: 1.1rem;
        }

        .nav-text {
          font-size: 0.9rem;
        }

        .discord-btn-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #5865F2 0%, #4752c4 100%);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .discord-btn-modern:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(88, 101, 242, 0.3);
        }

        /* Hero Section */
        .hero-modern {
background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
          position: relative;
          overflow: hidden;
          padding: 4rem 0 6rem;
        }

        .hero-modern::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
}

        .hero-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .hero-text {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .hero-title {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .hero-title-main {
          font-size: 3rem;
          font-weight: 800;
          color: #fff;
          line-height: 1.1;
        }

        .hero-title-accent {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4CC9F0 0%, #667eea 50%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.1;
        }

        .hero-description {
          font-size: 1.25rem;
          color: #cbd5e1;
          line-height: 1.6;
          max-width: 500px;
        }

        .hero-stats {
          display: flex;
          gap: 2rem;
          margin-top: 1rem;
        }

        .hero-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hero-stat .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #4CC9F0;
          line-height: 1;
        }

        .hero-stat .stat-label {
          font-size: 0.875rem;
          color: #94a3b8;
          margin-top: 0.25rem;
          text-align: center;
        }

        .hero-visual {
          position: relative;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .floating-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 1rem;
          min-width: 140px;
          animation: float 6s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .rank-1 {
          top: 20%;
          left: 10%;
          animation-delay: 0s;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1));
          border-color: rgba(255, 215, 0, 0.3);
        }

        .rank-2 {
          bottom: 20%;
          left: 40%;
          animation-delay: 2s;
          background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.1));
          border-color: rgba(192, 192, 192, 0.3);
        }

        .rank-3 {
          top: 50%;
          right: 10%;

          animation-delay: 4s;
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.1));
          border-color: rgba(205, 127, 50, 0.3);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .rank-badge {
          font-size: 1.25rem;
        }

        .player-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #fff;
        }

        .card-stats {
          font-size: 0.75rem;
          color: #cbd5e1;
        }

        .wave-divider {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          overflow: hidden;
          line-height: 0;
        }

        .wave-divider svg {
          position: relative;
          display: block;
          width: calc(100% + 1.3px);
          height: 80px;
        }

        .wave-divider .shape-fill {
          fill: #0f172a;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* Filtros Modernos */
        .filters-section-modern {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 2rem;
          margin-top: -2rem;
          position: relative;
          z-index: 10;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .filters-grid-modern {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 1rem;
          align-items: end;
        }

        .filter-group-modern {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 0.25rem;
        }

        .invisible {
          visibility: hidden;
        }

        .search-input-wrapper-modern {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon-modern {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
          z-index: 2;
        }

        .search-input-modern {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 0.875rem;
          transition: all 0.3s ease;
        }

        .search-input-modern:focus {
          outline: none;
          border-color: #4CC9F0;
          box-shadow: 0 0 0 2px rgba(76, 201, 240, 0.2);
        }

        .search-input-modern::placeholder {
          color: #94a3b8;
        }

        .clear-search-modern {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .clear-search-modern:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .filter-select-modern {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-select-modern:focus {
          outline: none;
          border-color: #4CC9F0;
          box-shadow: 0 0 0 2px rgba(76, 201, 240, 0.2);
        }

        .filter-select-modern option {
          background: #1e293b;
          color: white;
        }

        .refresh-button-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #4CC9F0 0%, #667eea 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .refresh-button-modern:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(76, 201, 240, 0.3);
        }

        .refresh-button-modern:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-icon {
          transition: transform 0.3s ease;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .search-results-info-modern {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(76, 201, 240, 0.1);
          border: 1px solid rgba(76, 201, 240, 0.2);
          border-radius: 8px;
          color: #4CC9F0;
          font-size: 0.875rem;
        }

        /* Stats Overview */
        .stats-overview-modern {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin: 2rem 0;
        }

        .stat-card-modern {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
        }

        .stat-card-modern:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
          border-color: rgba(76, 201, 240, 0.3);
        }

        .stat-icon {
          font-size: 2rem;
          opacity: 0.8;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-number-modern {
          font-size: 2rem;
          font-weight: 700;
          color: white;
          line-height: 1;
        }

        .stat-label-modern {
          font-size: 0.875rem;
          color: #94a3b8;
          margin-top: 0.25rem;
        }

        /* Tabs */
        .tabs-section-modern {
          margin: 2rem 0;
        }

        .tabs-modern {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.5rem;
        }

        .tab-modern {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          color: #cbd5e1;
          font-weight: 600;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.3s ease;
          flex: 1;
          justify-content: center;
        }

        .tab-modern:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }

        .tab-modern.active {
          color: white;
          background: linear-gradient(135deg, #4CC9F0 0%, #667eea 100%);
          box-shadow: 0 4px 12px rgba(76, 201, 240, 0.3);
        }

        .tab-icon {
          font-size: 1.1rem;
        }

        .tab-text {
          font-size: 0.9rem;
        }

        .tab-badge-modern {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* Main Content */
        .main-content-modern {
          margin: 2rem 0;
        }

        .section-header-modern {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .section-header-modern h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .section-icon {
          font-size: 1.5rem;
        }

        .player-count-modern {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        /* Tables */
        .table-container-modern {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }

        .leaderboard-table-modern {
          width: 100%;
          border-collapse: collapse;
        }

        .leaderboard-table-modern thead {
          background: rgba(255, 255, 255, 0.1);
        }

        .leaderboard-table-modern th {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #cbd5e1;
          font-size: 0.875rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .leaderboard-table-modern td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .player-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .rank-cell {
          text-align: center;
        }

        .rank-badge-modern {
          font-weight: 700;
          font-size: 1.1rem;
        }

        .rank-badge-modern.top-rank {
          font-size: 1.5rem;
        }

        .player-info-modern {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .player-avatar-modern {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4CC9F0, #667eea);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .player-details {
          display: flex;
          flex-direction: column;
        }

        .player-name-modern {
          color: white;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .player-name-modern:hover {
          color: #4CC9F0;
        }

        .player-matches {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 0.25rem;
        }

.level-badge-modern {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

        .winrate-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .winrate-value {
          min-width: 40px;
          font-weight: 600;
        }

        .high-winrate {
          color: #10b981;
        }

        .winrate-bar {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .winrate-progress {
          height: 100%;
          background: currentColor;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .matches-result {
          display: flex;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .wins {
          color: #10b981;
          font-weight: 600;
        }

        .losses {
          color: #ef4444;
          font-weight: 600;
        }

        .no-results-modern {
          text-align: center;
          padding: 3rem;
        }

        .no-results-content-modern {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: #94a3b8;
        }

        .no-results-icon {
          font-size: 3rem;
          opacity: 0.5;
        }

        .no-results-text {
          font-size: 1.125rem;
          margin: 0;
        }

        .clear-filters-btn-modern {
          background: #4CC9F0;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clear-filters-btn-modern:hover {
          background: #3aa8d8;
        }

        .table-footer-modern {
          padding: 1rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.875rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Clan Styles */
        .clan-stats-modern {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .clans-table-modern .clan-row-modern {
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .clans-table-modern .clan-row-modern:hover {
          background: rgba(76, 201, 240, 0.1);
        }

        .clans-table-modern .clan-row-modern.expanded {
          background: rgba(76, 201, 240, 0.15);
        }

        .clan-rank-badge {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .clan-info-modern {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .clan-avatar-modern {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.1rem;
        }

        .clan-name-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          font-weight: 600;
        }

        .expansion-arrow {
          font-size: 0.75rem;
          color: #4CC9F0;
          transition: transform 0.3s ease;
        }

        .expansion-arrow.expanded {
          transform: rotate(180deg);
        }

        .clan-description {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 0.25rem;
        }

        .clan-tag-modern {
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.75rem;
        }

        .active-high {
          color: #10b981;
          font-weight: 600;
        }

        .clan-members-row-modern {
          background: rgba(255, 255, 255, 0.02);
        }

        .clan-members-container-modern {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin: 0.5rem;
        }

        .loading-members-modern {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          justify-content: center;
          padding: 2rem;
          color: #94a3b8;
        }

        .spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #4CC9F0;
          animation: spin 1s linear infinite;
        }

        .members-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #4CC9F0;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .members-icon {
          font-size: 1.2rem;
        }

        .members-grid-modern {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .member-card-modern {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .member-card-modern:hover {
          transform: translateY(-2px);
          border-color: #4CC9F0;
          box-shadow: 0 8px 25px rgba(76, 201, 240, 0.2);
        }

        .member-header-modern {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .member-avatar-modern {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4CC9F0, #667eea);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .member-info-modern {
          display: flex;
          flex-direction: column;
        }

        .member-name-modern {
          color: white;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .member-name-modern:hover {
          color: #4CC9F0;
        }

        .member-role-modern {
          font-size: 0.75rem;
          color: #10b981;
          background: rgba(16, 185, 129, 0.2);
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          margin-top: 0.25rem;
          display: inline-block;
        }

        .member-stats-modern {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .member-stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.25rem 0;
        }

        .member-stat-label {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .member-stat-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
        }

        .member-rank-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 8px;
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .aoe4world-link-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #4CC9F0, #667eea);
          color: white;
          text-decoration: none;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.3s ease;
          justify-content: center;
        }

        .aoe4world-link-modern:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(76, 201, 240, 0.3);
        }

        .link-icon {
          font-size: 0.875rem;
        }

        .no-members-modern {
          text-align: center;
          padding: 2rem;
          color: #94a3b8;
        }

        .no-members-icon {
          font-size: 2rem;
          opacity: 0.5;
          margin-bottom: 1rem;
          display: block;
        }

        .no-clans-message-modern {
          text-align: center;
          padding: 4rem 2rem;
          color: #94a3b8;
        }

        .no-clans-icon {
          font-size: 4rem;
          opacity: 0.5;
          margin-bottom: 1rem;
          display: block;
        }

        .no-clans-message-modern h3 {
          color: white;
          margin-bottom: 1rem;
        }

        .discord-btn-large-modern {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          background: linear-gradient(135deg, #5865F2 0%, #4752c4 100%);
          color: white;
          text-decoration: none;
          padding: 1rem 2rem;
          border-radius: 10px;
          font-weight: 600;
          transition: all 0.3s ease;
          margin-top: 1rem;
        }

        .discord-btn-large-modern:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(88, 101, 242, 0.3);
        }

        /* Footer */
        .modern-footer {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin-top: 4rem;
          padding: 3rem 0 1rem;
        }

        .footer-main-modern {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .footer-section-modern {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .footer-section-modern .section-header-modern {
          border: none;
          padding: 0;
          margin: 0;
        }

        .footer-section-modern .section-header-modern h3 {
          font-size: 1.125rem;
          color: white;
          margin: 0;
        }

        .discord-cta-modern p {
          color: #cbd5e1;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0.5rem 0;
        }

        .command-box-modern {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin: 1rem 0;
        }

        .command-box-modern code {
          flex: 1;
          font-family: monospace;
          color: #10b981;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .copy-btn-modern {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #cbd5e1;
          padding: 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .copy-btn-modern:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .ranking-system-modern {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rank-item-modern {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .rank-icon-modern {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4CC9F0, #667eea);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
        }

        .rank-info-modern strong {
          display: block;
          color: white;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        .rank-info-modern span {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .game-modes-grid-modern {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .mode-card-modern {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .mode-card-modern.featured {
          background: linear-gradient(135deg, rgba(76, 201, 240, 0.1), rgba(102, 126, 234, 0.1));
          border-color: rgba(76, 201, 240, 0.3);
        }

        .mode-card-modern:hover {
          transform: translateY(-2px);
          border-color: #4CC9F0;
        }

        .mode-icon-modern {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .mode-card-modern.featured .mode-icon-modern {
          background: linear-gradient(135deg, #4CC9F0, #667eea);
        }

        .mode-content-modern h4 {
          color: white;
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
        }

        .mode-content-modern p {
          color: #cbd5e1;
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
        }

        .mode-stats-modern {
          font-size: 0.75rem;
          color: #10b981;
          font-weight: 600;
        }

        .quick-links-grid-modern {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .quick-link-modern {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: #cbd5e1;
          text-decoration: none;
          transition: all 0.3s ease;
          font-size: 0.875rem;
        }

        .quick-link-modern:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .quick-link-modern.discord {
          background: rgba(88, 101, 242, 0.1);
        }

        .footer-bottom-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .copyright-modern {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .footer-logo-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: white;
        }

        .logo-icon-small {
          font-size: 1.25rem;
        }

        .copyright-modern p {
          color: #94a3b8;
          font-size: 0.875rem;
          margin: 0;
        }

        .social-links-modern {
          display: flex;
          gap: 0.75rem;
        }

        .social-link-modern {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .social-link-modern:hover {
          background: #4CC9F0;
          color: white;
          transform: translateY(-2px);
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .hero-content {
            gap: 2rem;
          }

          .hero-title-main {
            font-size: 2.5rem;
          }

          .hero-title-accent {
            font-size: 2rem;
          }

          .footer-main-modern {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .header-content-modern {
            flex-direction: column;
            gap: 1rem;
          }

          .nav-modern {
            gap: 0.5rem;
          }

          .nav-text {
            display: none;
          }

          .hero-content {
            grid-template-columns: 1fr;
            gap: 2rem;
            text-align: center;
          }

          .hero-title-main {
            font-size: 2rem;
          }

          .hero-title-accent {
            font-size: 1.75rem;
          }

          .hero-description {
            font-size: 1.125rem;
          }

          .hero-stats {
            justify-content: center;
          }

          .hero-visual {
            height: 200px;
          }

          .filters-grid-modern {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .filters-section-modern {
            margin-top: 1rem;
            padding: 1.5rem;
          }

          .stats-overview-modern {
            grid-template-columns: repeat(2, 1fr);
          }

          .clan-stats-modern {
            grid-template-columns: repeat(2, 1fr);
          }

          .tabs-modern {
            flex-direction: column;
          }

          .footer-main-modern {
            grid-template-columns: 1fr;
          }

          .footer-bottom-modern {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .quick-links-grid-modern {
            grid-template-columns: 1fr;
          }

          .members-grid-modern {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .hero-title-main {
            font-size: 1.75rem;
          }

          .hero-title-accent {
            font-size: 1.5rem;
          }

          .hero-stats {
            flex-direction: column;
            gap: 1rem;
          }

          .stats-overview-modern {
            grid-template-columns: 1fr;
          }

          .clan-stats-modern {
            grid-template-columns: 1fr;
          }

          .floating-card {
            min-width: 120px;
            padding: 0.75rem;
          }
        }
      `}</style>
    </>
  );
}