'use client';

import { useState, useEffect } from 'react';

interface Stream {
  id: number;
  title: string;
  channel: string;
  url: string;
  type: 'video' | 'live';
  thumbnail?: string;
  live?: boolean;
  viewers?: number;
}



interface StreamsData {
  youtube: Stream[];
  twitch: Stream[];
}

export default function StreamSection() {
  const [streams, setStreams] = useState<StreamsData>({ youtube: [], twitch: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'youtube' | 'twitch'>('youtube');
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);

  useEffect(() => {
    loadStreams();
  }, []);

  const loadStreams = async () => {
    try {
      const response = await fetch('/api/streams');
      const data = await response.json();
      setStreams(data);
      
      // Auto-select first stream
      if (data.youtube.length > 0) {
        setSelectedStream(data.youtube[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar streams:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="streams-section">
        <div className="loading-streams">
          <div className="spinner"></div>
          <p>Carregando conteúdo...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="streams-section">
      <div className="container">
        <div className="section-header">
          <h2>
            <i className="fab fa-youtube youtube-icon"></i>
            <i className="fab fa-twitch twitch-icon"></i>
            Conteúdo da Comunidade
          </h2>
          <p>Assista aos melhores vídeos e lives dos jogadores brasileiros</p>
        </div>

        <div className="streams-container">
          {/* Player Principal */}
          <div className="stream-player">
            {selectedStream ? (
              <div className="player-container">
                <iframe
                  src={selectedStream.url}
                  title={selectedStream.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="video-iframe"
                ></iframe>
                <div className="player-info">
                  <h3>{selectedStream.title}</h3>
                  <div className="stream-meta">
                    <span className="channel">{selectedStream.channel}</span>
                    {selectedStream.live && (
                      <span className="live-badge">
                        <span className="live-dot"></span>
                        LIVE • {selectedStream.viewers} viewers
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-stream-selected">
                <i className="fas fa-play-circle"></i>
                <p>Selecione um vídeo ou live para assistir</p>
              </div>
            )}
          </div>

          {/* Lista de Streams */}
          <div className="streams-sidebar">
            <div className="streams-tabs">
              <button 
                className={`tab ${activeTab === 'youtube' ? 'active' : ''}`}
                onClick={() => setActiveTab('youtube')}
              >
                <i className="fab fa-youtube"></i>
                YouTube
                <span className="tab-badge">{streams.youtube.length}</span>
              </button>
              <button 
                className={`tab ${activeTab === 'twitch' ? 'active' : ''}`}
                onClick={() => setActiveTab('twitch')}
              >
                <i className="fab fa-twitch"></i>
                Twitch
                <span className="tab-badge">{streams.twitch.length}</span>
              </button>
            </div>

            <div className="streams-list">
              {streams[activeTab].map((stream) => (
                <div
                  key={stream.id}
                  className={`stream-item ${selectedStream?.id === stream.id ? 'active' : ''}`}
                  onClick={() => setSelectedStream(stream)}
                >
                  {stream.thumbnail && (
                    <div className="stream-thumbnail">
                      <img src={stream.thumbnail} alt={stream.title} />
                      {stream.live && <div className="live-indicator">LIVE</div>}
                      <div className="play-overlay">
                        <i className="fas fa-play"></i>
                      </div>
                    </div>
                  )}
                  <div className="stream-info">
                    <h4>{stream.title}</h4>
                    <p className="stream-channel">{stream.channel}</p>
                    {stream.live && (
                      <div className="stream-stats">
                        <span className="viewers">{stream.viewers} viewers</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .streams-section {
          padding: 40px 0;
        }

        .section-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .section-header h2 {
          color: white;
          font-size: 2rem;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }

        .youtube-icon {
          color: #FF0000;
        }

        .twitch-icon {
          color: #9146FF;
        }

        .section-header p {
          color: #cbd5e0;
          font-size: 1.1rem;
        }

        .streams-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .stream-player {
          border-radius: 12px;
          overflow: hidden;
        }

        .player-container {
          background: #000000ff;
        }

        .video-iframe {
          width: 100%;
          height: 400px;
          border: none;
          display: block;
        }

        .player-info {
          padding: 20px;
          background: rgba(255, 0, 0, 0.05);
        }

        .player-info h3 {
          color: white;
          margin-bottom: 10px;
          font-size: 1.2rem;
        }

        .stream-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .channel {
          color: #4CC9F0;
          font-weight: 600;
        }

        .live-badge {
          background: #E53E3E;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .streams-sidebar {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          overflow: hidden;
        }

        .streams-tabs {
          display: flex;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .streams-tabs .tab {
          flex: 1;
          padding: 15px;
          background: none;
          border: none;
          color: #cbd5e0;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          transition: all 0.3s;
        }

        .streams-tabs .tab.active {
          background: rgba(76, 201, 240, 0.2);
          color: white;
          border-bottom: 2px solid #4CC9F0;
        }

        .streams-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .stream-item {
          padding: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          gap: 12px;
        }

        .stream-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .stream-item.active {
          background: rgba(76, 201, 240, 0.15);
          border-left: 3px solid #4CC9F0;
        }

        .stream-thumbnail {
          position: relative;
          width: 80px;
          height: 60px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .stream-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .live-indicator {
          position: absolute;
          top: 5px;
          left: 5px;
          background: #E53E3E;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .play-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .stream-item:hover .play-overlay {
          opacity: 1;
        }

        .play-overlay i {
          color: white;
          font-size: 1.2rem;
        }

        .stream-info h4 {
          color: white;
          font-size: 0.9rem;
          margin-bottom: 5px;
          line-height: 1.2;
        }

        .stream-channel {
          color: #cbd5e0;
          font-size: 0.8rem;
          margin-bottom: 5px;
        }

        .stream-stats {
          font-size: 0.7rem;
          color: #81E6D9;
        }

        .no-stream-selected {
          height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #cbd5e0;
        }

        .no-stream-selected i {
          font-size: 3rem;
          margin-bottom: 15px;
          color: #4CC9F0;
        }

        .loading-streams {
          text-align: center;
          padding: 40px;
          color: #cbd5e0;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .streams-container {
            grid-template-columns: 1fr;
          }
          
          .video-iframe {
            height: 250px;
          }
        }
      `}</style>
    </section>
  );
}