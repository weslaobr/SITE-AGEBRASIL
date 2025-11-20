// streamers-api.js
class StreamersManager {
    constructor() {
        this.creators = [];
        this.twitchAccessToken = null;
        this.currentFilter = 'all';
        this.isLoading = false;
    }

    async init() {
        await this.getTwitchAccessToken();
        await this.loadAllCreators();
        this.renderLiveStreams();
        this.renderAllCreators();
        this.setupEventListeners();

        // Auto-refresh a cada 5 minutos
        setInterval(() => this.refreshData(), 300000);
    }

    // Autenticação Twitch
    async getTwitchAccessToken() {
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `client_id=${CONFIG.TWITCH.CLIENT_ID}&client_secret=${CONFIG.TWITCH.CLIENT_SECRET}&grant_type=client_credentials`
            });

            if (!response.ok) throw new Error('Falha na autenticação Twitch');

            const data = await response.json();
            this.twitchAccessToken = data.access_token;
            console.log('✅ Twitch autenticado');
        } catch (error) {
            console.error('❌ Erro na autenticação Twitch:', error);
        }
    }

    // Buscar streams ao vivo do Twitch
    async fetchTwitchStreams(usernames) {
        if (!this.twitchAccessToken || usernames.length === 0) return [];

        try {
            const query = usernames.map(u => `user_login=${u}`).join('&');
            const response = await fetch(
                `https://api.twitch.tv/helix/streams?${query}&first=100`,
                {
                    headers: {
                        'Client-ID': CONFIG.TWITCH.CLIENT_ID,
                        'Authorization': `Bearer ${this.twitchAccessToken}`
                    }
                }
            );

            if (!response.ok) throw new Error('Falha ao buscar streams Twitch');

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar streams Twitch:', error);
            return [];
        }
    }

    // Buscar informações dos canais Twitch
    async fetchTwitchUsers(usernames) {
        if (!this.twitchAccessToken || usernames.length === 0) return [];

        try {
            const query = usernames.map(u => `login=${u}`).join('&');
            const response = await fetch(
                `https://api.twitch.tv/helix/users?${query}`,
                {
                    headers: {
                        'Client-ID': CONFIG.TWITCH.CLIENT_ID,
                        'Authorization': `Bearer ${this.twitchAccessToken}`
                    }
                }
            );

            if (!response.ok) throw new Error('Falha ao buscar usuários Twitch');

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar usuários Twitch:', error);
            return [];
        }
    }

    // Buscar dados do YouTube
    async fetchYouTubeChannel(channelId) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${CONFIG.YOUTUBE.API_KEY}`
            );

            if (!response.ok) throw new Error('Falha ao buscar canal YouTube');

            const data = await response.json();
            return data.items && data.items.length > 0 ? data.items[0] : null;
        } catch (error) {
            console.error(`❌ Erro ao buscar canal YouTube ${channelId}:`, error);
            return null;
        }
    }

    // Buscar último vídeo do YouTube
    async fetchYouTubeLatestVideo(channelId) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=1&order=date&type=video&key=${CONFIG.YOUTUBE.API_KEY}`
            );

            if (!response.ok) throw new Error('Falha ao buscar vídeos YouTube');

            const data = await response.json();
            return data.items && data.items.length > 0 ? data.items[0] : null;
        } catch (error) {
            console.error(`❌ Erro ao buscar vídeos YouTube ${channelId}:`, error);
            return null;
        }
    }

    // Carregar todos os criadores com dados reais
    async loadAllCreators() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            console.log('🔄 Carregando dados dos criadores...');

            // Coletar usernames Twitch
            const twitchUsernames = CREATORS_CONFIG
                .filter(creator => creator.platforms.twitch)
                .map(creator => creator.platforms.twitch);

            // Buscar dados Twitch em paralelo
            const [twitchStreams, twitchUsers] = await Promise.all([
                this.fetchTwitchStreams(twitchUsernames),
                this.fetchTwitchUsers(twitchUsernames)
            ]);

            // Mapa rápido para streams
            const streamsMap = new Map();
            twitchStreams.forEach(stream => {
                streamsMap.set(stream.user_login.toLowerCase(), stream);
            });

            // Mapa rápido para usuários
            const usersMap = new Map();
            twitchUsers.forEach(user => {
                usersMap.set(user.login.toLowerCase(), user);
            });

            // Processar cada criador
            this.creators = await Promise.all(
                CREATORS_CONFIG.map(async (creator) => {
                    const twitchUsername = creator.platforms.twitch;
                    const twitchUser = usersMap.get(twitchUsername?.toLowerCase());
                    const twitchStream = streamsMap.get(twitchUsername?.toLowerCase());

                    const isLive = !!twitchStream;

                    // Dados YouTube
                    let youtubeData = null;
                    let latestVideo = null;

                    if (creator.platforms.youtube) {
                        youtubeData = await this.fetchYouTubeChannel(creator.platforms.youtube.id);
                        latestVideo = await this.fetchYouTubeLatestVideo(creator.platforms.youtube.id);
                    }

                    return {
                        ...creator,
                        avatar: twitchUser?.profile_image_url || 'https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-profile_image-300x300.png',
                        isLive,
                        twitchData: twitchUser ? {
                            profile: twitchUser,
                            stream: twitchStream
                        } : null,
                        youtubeData: youtubeData ? {
                            channel: youtubeData,
                            latestVideo: latestVideo
                        } : null,
                        liveViewers: twitchStream?.viewer_count || 0,
                        liveTitle: twitchStream?.title || null,
                        lastStream: this.formatRelativeTime(twitchStream?.started_at || twitchUser?.created_at)
                    };
                })
            );

            console.log('✅ Dados carregados:', this.creators);

        } catch (error) {
            console.error('💥 Erro ao carregar criadores:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // Renderizar streams ao vivo
    renderLiveStreams() {
        const container = document.getElementById('live-streams-container');
        const liveStreams = this.creators.filter(creator => creator.isLive);

        if (liveStreams.length === 0) {
            container.innerHTML = `
                <div class="no-live-streams">
                    <i class="fas fa-tv"></i>
                    <h3>Nenhuma transmissão ao vivo no momento</h3>
                    <p>Volte mais tarde para acompanhar os criadores brasileiros!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = liveStreams.map(creator => `
            <div class="live-stream-card">
                <div class="live-badge">
                    <span class="pulse"></span>
                    AO VIVO
                </div>
                <div class="stream-preview" onclick="window.open('https://twitch.tv/${creator.platforms.twitch}', '_blank')">
                    <img src="${creator.avatar}" alt="${creator.name}" 
                         onerror="this.src='https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-profile_image-300x300.png'">
                    <div class="viewer-count">👁️ ${this.formatNumber(creator.liveViewers)}</div>
                </div>
                <div class="stream-info">
                    <div class="streamer-info">
                        <div class="streamer-avatar">
                            <img src="${creator.avatar}" alt="${creator.name}"
                                 onerror="this.src='https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-profile_image-300x300.png'">
                        </div>
                        <div class="streamer-details">
                            <h3>${creator.name}</h3>
                            <p>${creator.platforms.twitch ? `@${creator.platforms.twitch}` : creator.platforms.youtube?.handle || ''}</p>
                        </div>
                    </div>
                    <div class="stream-title" title="${creator.liveTitle || 'Age of Empires IV'}">
                        ${creator.liveTitle || 'Transmissão de Age of Empires IV'}
                    </div>
                    <a href="https://twitch.tv/${creator.platforms.twitch}" target="_blank" class="watch-live-btn">
                        <i class="fas fa-play"></i> Assistir Transmissão
                    </a>
                </div>
            </div>
        `).join('');
    }

    // Renderizar todos os criadores
    renderAllCreators() {
        const grid = document.getElementById('all-creators-grid');
        let filteredCreators = this.creators;

        // Aplicar filtros
        switch (this.currentFilter) {
            case 'twitch':
                filteredCreators = this.creators.filter(c => c.platforms.twitch);
                break;
            case 'youtube':
                filteredCreators = this.creators.filter(c => c.platforms.youtube);
                break;
            case 'live':
                filteredCreators = this.creators.filter(c => c.isLive);
                break;
        }

        if (filteredCreators.length === 0) {
            grid.innerHTML = `
                <div class="no-creators">
                    <i class="fas fa-users"></i>
                    <h3>Nenhum criador encontrado</h3>
                    <p>Tente alterar os filtros</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filteredCreators.map(creator => this.createCreatorCard(creator)).join('');
    }

    // Criar card de criador
    createCreatorCard(creator) {
        const isLive = creator.isLive;
        const hasYouTube = !!creator.platforms.youtube;
        const hasTwitch = !!creator.platforms.twitch;

        // Estatísticas
        const subscribers = creator.youtubeData?.channel?.statistics?.subscriberCount || 'N/A';
        const videos = creator.youtubeData?.channel?.statistics?.videoCount || 'N/A';

        return `
            <div class="creator-card ${isLive ? 'live' : ''}">
                <div class="creator-header">
                    <div class="creator-avatar">
                        <img src="${creator.avatar}" alt="${creator.name}"
                             onerror="this.src='https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-profile_image-300x300.png'">
                        ${isLive ? '<div class="live-indicator"></div>' : ''}
                    </div>
                    <div class="platform-icons">
                        ${hasTwitch ? '<span class="platform-icon twitch" title="Twitch">🎮</span>' : ''}
                        ${hasYouTube ? '<span class="platform-icon youtube" title="YouTube">📺</span>' : ''}
                    </div>
                </div>

                <div class="creator-info">
                    <h4 class="creator-name">${creator.name}</h4>
                    <p class="creator-description">${creator.description}</p>
                    
                    <div class="specialty-tags">
                        ${creator.specialty.map(spec => `<span class="tag">${spec}</span>`).join('')}
                    </div>

                    <div class="creator-stats">
                        ${isLive ? `
                            <div class="live-stats">
                                <span class="viewers">👁️ ${this.formatNumber(creator.liveViewers)} viewers</span>
                                <span class="live-status">• AO VIVO</span>
                            </div>
                        ` : ''}
                        
                        ${hasYouTube ? `
                            <div class="youtube-stats">
                                <span>👥 ${this.formatNumber(subscribers)} inscritos</span>
                                <span>🎬 ${this.formatNumber(videos)} vídeos</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="creator-actions">
                    ${hasTwitch ? `
                        <a href="https://twitch.tv/${creator.platforms.twitch}" target="_blank" 
                           class="action-btn twitch ${isLive ? 'live' : ''}">
                            ${isLive ? '🔴 Assistir' : 'Ver Twitch'}
                        </a>
                    ` : ''}
                    
                    ${hasYouTube ? `
                        <a href="https://youtube.com/${creator.platforms.youtube.handle}" target="_blank" 
                           class="action-btn youtube">
                            Ver YouTube
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Utilitários
    formatNumber(num) {
        if (num === 'N/A' || !num) return 'N/A';
        const number = parseInt(num);
        if (isNaN(number)) return 'N/A';

        if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
        if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
        return number.toString();
    }

    formatRelativeTime(dateString) {
        if (!dateString) return 'Nunca';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `Há ${diffMins} min`;
        if (diffHours < 24) return `Há ${diffHours} h`;
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return `Há ${diffDays} dias`;
        if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} sem`;
        return `Há ${Math.floor(diffDays / 30)} mes`;
    }

    // Event Listeners
    setupEventListeners() {
        // Filtros
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.view;
                this.renderAllCreators();
            });
        });

        // Botão de refresh
        const refreshBtn = document.getElementById('refresh-streams');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }
    }

    // Refresh dados
    async refreshData() {
        await this.loadAllCreators();
        this.renderLiveStreams();
        this.renderAllCreators();

        // Mostrar feedback
        const event = new CustomEvent('streamersRefreshed', {
            detail: { timestamp: new Date() }
        });
        document.dispatchEvent(event);
    }
}

// Inicializar quando DOM carregar
document.addEventListener('DOMContentLoaded', async () => {
    window.streamersManager = new StreamersManager();
    await window.streamersManager.init();
});

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StreamersManager, CREATORS_CONFIG };
}