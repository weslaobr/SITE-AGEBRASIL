'use client';

import { useState, useEffect } from 'react';

interface Tournament {
  id: number;
  name: string;
  organizer: string;
  game: string;
  format: string;
  prize: string;
  participants: number;
  registered?: number;
  winner?: string;
  runner_up?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'upcoming' | 'completed';
  bracket_url?: string;
  registration_url?: string;
  discord_url?: string;
  vod_url?: string;
  thumbnail?: string;
}

export default function TournamentSection() {
  const [tournaments, setTournaments] = useState<{
    active: Tournament[];
    upcoming: Tournament[];
    completed: Tournament[];
  }>({ active: [], upcoming: [], completed: [] });
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setApiStatus('loading');
      
      console.log('🔄 Loading tournaments...');
      const response = await fetch('/api/tournaments');
      
      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Tournaments data:', data);
      
      setTournaments(data);
      setApiStatus('success');
      
    } catch (error) {
      console.error('❌ Error loading tournaments:', error);
      setApiStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const refreshTournaments = async () => {
    try {
      setLoading(true);
      setApiStatus('loading');
      const response = await fetch('/api/tournaments?refresh=true');
      const data = await response.json();
      setTournaments(data);
      setApiStatus('success');
    } catch (error) {
      console.error('Erro ao atualizar torneios:', error);
      setApiStatus('error');
    } finally {
      setLoading(false);
    }
  };

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      return 'Data a confirmar';
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return 'Data a confirmar';
  }
};

// Função para formatar o período completo
const formatDateRange = (startDate: string, endDate: string, status: string) => {
  if (status === 'completed') {
    return `Finalizado em ${formatDate(endDate)}`;
  }
  
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  // Se for o mesmo dia
  if (start === end) {
    return start;
  }
  
  return `${start} - ${end}`;
};

  if (loading) {
    return (
      <section className="tournaments-section">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Carregando torneios...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tournaments-section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <div className="title-group">
            <div className="icon-wrapper">
              <i className="fas fa-trophy"></i>
            </div>
            <div>
              <h1>Torneios & Competições</h1>
              <p>
                {apiStatus === 'loading' && '🔄 Carregando...'}
                {apiStatus === 'success' && '✅ Sincronizado com AoE4World'}
                {apiStatus === 'error' && '❌ Usando dados locais'}
              </p>
            </div>
          </div>
          <button 
            onClick={refreshTournaments}
            className="refresh-btn"
            title="Atualizar torneios"
            disabled={loading}
          >
            <i className={`fas fa-sync-alt ${loading ? 'spinning' : ''}`}></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              <span className="tab-icon">
                <i className="fas fa-play-circle"></i>
              </span>
              <span className="tab-label">Em Andamento</span>
              <span className="tab-count">{tournaments.active.length}</span>
            </button>
            
            <button 
              className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              <span className="tab-icon">
                <i className="fas fa-clock"></i>
              </span>
              <span className="tab-label">Próximos</span>
              <span className="tab-count">{tournaments.upcoming.length}</span>
            </button>
            
            <button 
              className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              <span className="tab-icon">
                <i className="fas fa-flag-checkered"></i>
              </span>
              <span className="tab-label">Finalizados</span>
              <span className="tab-count">{tournaments.completed.length}</span>
            </button>
          </div>
        </div>

        {/* Tournament Grid */}
        <div className="tournaments-grid">
          {tournaments[activeTab].map((tournament) => (
            <div key={tournament.id} className="tournament-card">

              
              {/* Card Header with Image */}
              <div className="card-header">
                {tournament.thumbnail ? (
                  <img 
                    src={tournament.thumbnail} 
                    alt={tournament.name}
                    className="tournament-image"
                    onError={(e) => {
                      e.currentTarget.src = '/images/default-tournament.jpg';
                    }}
                  />
                ) : (
                  <div className="tournament-image-placeholder">
                    <i className="fas fa-trophy"></i>
                  </div>
                )}
                <div className={`status-badge status-${tournament.status}`}>
                  {tournament.status === 'active' && '🟢 AO VIVO'}
                  {tournament.status === 'upcoming' && '⏳ EM BREVE'}
                  {tournament.status === 'completed' && '✅ FINALIZADO'}
                </div>
              </div>

              {/* Card Content */}
              <div className="card-content">
                <h3 className="tournament-title">{tournament.name}</h3>
                
                <div className="tournament-organizer">
                  <i className="fas fa-user"></i>
                  <span>{tournament.organizer}</span>
                </div>

                <div className="tournament-details">
                  <div className="detail-row">
                    <i className="fas fa-calendar"></i>
                    <span>
                      {tournament.status === 'completed' 
                        ? `Finalizado em ${formatDate(tournament.end_date)}`
                        : `${formatDate(tournament.start_date)} - ${formatDate(tournament.end_date)}`
                      }
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <i className="fas fa-users"></i>
                    <span>
                      {tournament.status === 'completed' 
                        ? `${tournament.participants} participantes`
                        : `${tournament.registered || 0}/${tournament.participants} inscritos`
                      }
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <i className="fas fa-trophy"></i>
                    <span className="prize">{tournament.prize}</span>
                  </div>
                  
                  <div className="detail-row">
                    <i className="fas fa-chess-board"></i>
                    <span>{tournament.format}</span>
                  </div>
                </div>

                {/* Winners Section for Completed Tournaments */}
                {tournament.status === 'completed' && tournament.winner && (
                  <div className="winners-section">
                    <div className="winner">
                      <i className="fas fa-crown"></i>
                      <div>
                        <span className="winner-label">Campeão</span>
                        <span className="winner-name">{tournament.winner}</span>
                      </div>
                    </div>
                    {tournament.runner_up && (
                      <div className="runner-up">
                        <i className="fas fa-medal"></i>
                        <div>
                          <span className="winner-label">Vice-campeão</span>
                          <span className="winner-name">{tournament.runner_up}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

{/* Action Buttons */}
<div className="action-buttons">
  {tournament.status === 'active' && tournament.bracket_url && (
    <a 
      href={tournament.bracket_url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="btn btn-primary"
      onClick={(e) => {
        if (!tournament.bracket_url || tournament.bracket_url === '#') {
          e.preventDefault();
          alert('Link de chaveamento não disponível');
        }
      }}
    >
      <i className="fas fa-bracket-curly"></i>
      Ver Chaveamento
    </a>
  )}
  
  {tournament.status === 'upcoming' && tournament.registration_url && (
    <a 
      href={tournament.registration_url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="btn btn-primary"
      onClick={(e) => {
        if (!tournament.registration_url || tournament.registration_url === '#') {
          e.preventDefault();
          alert('Link de inscrição não disponível');
        }
      }}
    >
      <i className="fas fa-edit"></i>
      Inscrever-se
    </a>
  )}
  
  {tournament.status === 'completed' && tournament.vod_url && (
    <a 
      href={tournament.vod_url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="btn btn-secondary"
    >
      <i className="fas fa-play"></i>
      Ver VODs
    </a>
  )}
  
  {tournament.discord_url && (
    <a 
      href={tournament.discord_url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="btn btn-discord"
    >
      <i className="fab fa-discord"></i>
      Discord
    </a>
  )}
  
  {/* Link para página do torneio no AoE4World */}
  <a 
    href={`https://aoe4world.com/tournaments/${tournament.id}`} 
    target="_blank" 
    rel="noopener noreferrer" 
    className="btn btn-secondary"
  >
    <i className="fas fa-external-link-alt"></i>
    Detalhes
  </a>
</div>
              </div>
            </div>
          ))}

          {tournaments[activeTab].length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-trophy"></i>
              </div>
              <h3>
                Nenhum torneio {activeTab === 'active' ? 'em andamento' : activeTab === 'upcoming' ? 'próximo' : 'finalizado'}
              </h3>
              <p>Fique ligado para os próximos eventos competitivos!</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .tournaments-section {
          background: #0f172a;
          min-height: 100vh;
          padding: 80px 0;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Header Styles */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 60px;
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 20px;
          text-align: left;
        }

<div className="detail-row">
  <i className="fas fa-calendar"></i>
  <span>
    {formatDateRange(tournament.start_date, tournament.end_date, tournament.status)}
  </span>
</div>



        .icon-wrapper {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: white;
        }

        .section-header h1 {
          font-size: 3rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .section-header p {
          color: #94a3b8;
          font-size: 1.2rem;
          margin: 0;
        }

        .refresh-btn {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border: none;
          color: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 1.2rem;
        }

        .refresh-btn:hover:not(:disabled) {
          transform: rotate(180deg);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Tabs Styles */
        .tabs-container {
          margin-bottom: 40px;
        }

        .tabs {
          display: inline-flex;
          background: #1e293b;
          border-radius: 16px;
          padding: 8px;
          border: 1px solid #334155;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.3s ease;
          font-weight: 600;
          position: relative;
        }

        .tab:hover {
          color: #e2e8f0;
          background: rgba(255, 255, 255, 0.05);
        }

        .tab.active {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
        }

        .tab-icon {
          font-size: 1.1rem;
        }

        .tab-label {
          font-size: 1rem;
        }

        .tab-count {
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 0.8rem;
          min-width: 24px;
          text-align: center;
        }

        .tab.active .tab-count {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Grid Styles */
        .tournaments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 24px;
        }

        /* Card Styles */
        .tournament-card {
          background: #1e293b;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #334155;
          transition: all 0.3s ease;
          position: relative;
        }

        .tournament-card:hover {
          transform: translateY(-8px);
          border-color: #3b82f6;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .card-header {
          position: relative;
          height: 160px;
          overflow: hidden;
        }

        .tournament-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .tournament-image-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #475569, #64748b);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 2rem;
        }

        .status-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-active {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border-color: rgba(34, 197, 94, 0.3);
        }

        .status-upcoming {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.3);
        }

        .status-completed {
          background: rgba(100, 116, 139, 0.2);
          color: #94a3b8;
          border-color: rgba(100, 116, 139, 0.3);
        }

        /* Card Content */
        .card-content {
          padding: 24px;
        }

        .tournament-title {
          color: white;
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .tournament-organizer {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 0.9rem;
          margin-bottom: 16px;
        }

        .tournament-organizer i {
          color: #3b82f6;
        }

        .tournament-details {
          margin-bottom: 20px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          color: #e2e8f0;
          font-size: 0.9rem;
        }

        .detail-row i {
          color: #3b82f6;
          width: 16px;
          text-align: center;
        }

        .prize {
          color: #fbbf24;
          font-weight: 600;
        }

        /* Winners Section */
        .winners-section {
          background: rgba(59, 130, 246, 0.1);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          border-left: 4px solid #3b82f6;
        }

        .winner, .runner-up {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .winner:last-child, .runner-up:last-child {
          margin-bottom: 0;
        }

        .winner i {
          color: #fbbf24;
          font-size: 1.2rem;
        }

        .runner-up i {
          color: #94a3b8;
          font-size: 1.1rem;
        }

        .winner-label {
          display: block;
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 2px;
        }

        .winner-name {
          display: block;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          flex: 1;
          justify-content: center;
          min-width: 120px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .btn-discord {
          background: #5865f2;
          color: white;
        }

        .btn-discord:hover {
          background: #4752c4;
          transform: translateY(-2px);
        }

        /* Empty State */
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 20px;
          color: #64748b;
        }

        .empty-icon {
          font-size: 4rem;
          color: #475569;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          color: #94a3b8;
          font-size: 1.5rem;
          margin-bottom: 12px;
        }

        .empty-state p {
          color: #64748b;
          font-size: 1rem;
        }

        /* Loading State */
        .loading {
          text-align: center;
          padding: 80px 20px;
          color: #94a3b8;
        }

        .spinner {
          border: 3px solid rgba(59, 130, 246, 0.3);
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .container {
            padding: 0 16px;
          }

          .section-header {
            flex-direction: column;
            gap: 20px;
            text-align: center;
          }

          .title-group {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }

          .section-header h1 {
            font-size: 2.2rem;
          }

          .tabs {
            flex-direction: column;
            width: 100%;
          }

          .tournaments-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }

          .btn {
            flex: none;
          }
        }
      `}</style>
    </section>
  );
}