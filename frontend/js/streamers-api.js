// streamers-api.js - VERSÃO OTIMIZADA
class StreamersManager {
    constructor() {
        this.creators = [];
        this.twitchAccessToken = null;
        this.currentFilter = 'all';
        this.cacheDuration = 5 * 60 * 1000; // 5 minutos de cache
    }

    async init() {
        console.time('⏱️ Inicialização completa');

        // Carregar imediatamente com dados locais
        this.loadFromCache();

        // Buscar token Twitch em paralelo com renderização
        Promise.all([
            this.getTwitchAccessToken(),
            this.renderSkeletonUI() // UI imediata
        ]).then(async () => {
            await this.loadAllCreatorsFast();
            this.renderAllViews();
            this.setupEventListeners();
        });

        console.timeEnd('⏱️ Inicialização completa');
    }

    // UI esqueleto para carregamento instantâneo
    renderSkeletonUI() {
        const liveContainer = document.getElementById('live-streams-container');
        const creatorsGrid = document.getElementById('all-creators-grid');

        // Skeleton para streams ao vivo
        liveContainer.innerHTML = `
            <div class="skeleton-streams">
                ${Array(3).fill().map(() => `
                    <div class="skeleton-stream-card">
                        <div class="skeleton-thumbnail"></div>
                        <div class="skeleton-content">
                            <div class="skeleton-avatar"></div>
                            <div class="skeleton-text">
                                <div class="skeleton-line short"></div>
                                <div class="skeleton-line medium"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Skeleton para criadores
        creatorsGrid.innerHTML = `
            <div class="skeleton-creators">
                ${Array(8).fill().map(() => `
                    <div class="skeleton-creator-card">
                        <div class="skeleton-avatar-large"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-line long"></div>
                            <div class="skeleton-line short"></div>
                            <div class="skeleton-tags">
                                <div class="skeleton-tag"></div>
                                <div class="skeleton-tag"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Sistema de Cache Melhorado
    saveToCache(key, data) {
        try {
            const cacheData = {
                data: data,
                expiry: Date.now() + this.cacheDuration,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(`aoe4_${key}`, JSON.stringify(cacheData));
        } catch (error) {
            console.log('⚠️ Cache desabilitado (localStorage cheio)');
        }
    }

    getFromCache(key) {
        try {
            const cached = localStorage.getItem(`aoe4_${key}`);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            if (Date.now() > cacheData.expiry) {
                localStorage.removeItem(`aoe4_${key}`);
                return null;
            }

            console.log(`📦 Cache: ${key} (${new Date(cacheData.timestamp).toLocaleTimeString()})`);
            return cacheData.data;
        } catch (error) {
            return null;
        }
    }

    loadFromCache() {
        const cachedCreators = this.getFromCache('creators');
        if (cachedCreators) {
            this.creators = cachedCreators;
            this.renderAllViews();
        }
    }

    // Autenticação Twitch Otimizada
    async getTwitchAccessToken() {
        const cachedToken = this.getFromCache('twitch_token');
        if (cachedToken) {
            this.twitchAccessToken = cachedToken;
            return;
        }

        try {
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `client_id=${CONFIG.TWITCH.CLIENT_ID}&client_secret=${CONFIG.TWITCH.CLIENT_SECRET}&grant_type=client_credentials`
            });

            const data = await response.json();
            this.twitchAccessToken = data.access_token;
            this.saveToCache('twitch_token', data.access_token);
        } catch (error) {
            console.error('❌ Erro Twitch auth:', error);
        }
    }

    // Carregamento RÁPIDO em paralelo
    async loadAllCreatorsFast() {
        console.time('🚀 Carregamento rápido');

        try {
            // Buscar TODOS os dados em paralelo
            const [twitchData, youtubeData] = await Promise.all([
                this.fetchAllTwitchData(),
                this.fetchAllYouTubeData()
            ]);

            // Combinar dados (super rápido)
            this.creators = CREATORS_CONFIG.map(creator => {
                const twitchUsername = creator.platforms.twitch;
                const youtubeChannel = creator.platforms.youtube;

                const twitchStream = twitchData.streams.find(s =>
                    s.user_login.toLowerCase() === twitchUsername?.toLowerCase()
                );
                const twitchUser = twitchData.users.find(u =>
                    u.login.toLowerCase() === twitchUsername?.toLowerCase()
                );
                const youtubeChannelData = youtubeData.find(y =>
                    y.id === youtubeChannel?.id
                );

                return {
                    ...creator,
                    avatar: twitchUser?.profile_image_url || 'https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-300x300.png',
                    isLive: !!twitchStream,
                    twitchData: twitchUser ? { profile: twitchUser, stream: twitchStream } : null,
                    youtubeData: youtubeChannelData || null,
                    liveViewers: twitchStream?.viewer_count || 0,
                    liveTitle: twitchStream?.title || 'Age of Empires IV',
                    lastStream: this.formatRelativeTime(twitchStream?.started_at)
                };
            });

            // Salvar cache
            this.saveToCache('creators', this.creators);
            console.timeEnd('🚀 Carregamento rápido');

        } catch (error) {
            console.error('💥 Erro no carregamento rápido:', error);
        }
    }

    // Buscar TODOS os dados Twitch de uma vez
    async fetchAllTwitchData() {
        if (!this.twitchAccessToken) return { streams: [], users: [] };

        const twitchUsernames = CREATORS_CONFIG
            .filter(creator => creator.platforms.twitch)
            .map(creator => creator.platforms.twitch);

        if (twitchUsernames.length === 0) return { streams: [], users: [] };

        try {
            // Buscar streams e usuários em paralelo
            const [streamsResponse, usersResponse] = await Promise.all([
                fetch(`https://api.twitch.tv/helix/streams?${twitchUsernames.map(u => `user_login=${u}`).join('&')}&first=100`, {
                    headers: {
                        'Client-ID': CONFIG.TWITCH.CLIENT_ID,
                        'Authorization': `Bearer ${this.twitchAccessToken}`
                    }
                }),
                fetch(`https://api.twitch.tv/helix/users?${twitchUsernames.map(u => `login=${u}`).join('&')}`, {
                    headers: {
                        'Client-ID': CONFIG.TWITCH.CLIENT_ID,
                        'Authorization': `Bearer ${this.twitchAccessToken}`
                    }
                })
            ]);

            const [streamsData, usersData] = await Promise.all([
                streamsResponse.json(),
                usersResponse.json()
            ]);

            return {
                streams: streamsData.data || [],
                users: usersData.data || []
            };

        } catch (error) {
            console.error('❌ Erro ao buscar dados Twitch:', error);
            return { streams: [], users: [] };
        }
    }

    // Buscar TODOS os dados YouTube de uma vez
    async fetchAllYouTubeData() {
        const youtubeChannels = CREATORS_CONFIG
            .filter(creator => creator.platforms.youtube)
            .map(creator => creator.platforms.youtube.id);

        if (youtubeChannels.length === 0) return [];

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${youtubeChannels.join(',')}&key=${CONFIG.YOUTUBE.API_KEY}`
            );

            const data = await response.json();
            return data.items || [];

        } catch (error) {
            console.error('❌ Erro ao buscar dados YouTube:', error);
            return [];
        }
    }

    // Renderização otimizada
    renderAllViews() {
        this.renderLiveStreams();
        this.renderAllCreators();
    }

    renderLiveStreams() {
        const container = document.getElementById('live-streams-container');
        const liveStreams = this.creators.filter(creator => creator.isLive);

        if (liveStreams.length === 0) {
            container.innerHTML = `
                <div class="no-live-streams">
                    <i class="fas fa-tv"></i>
                    <h3>Nenhuma transmissão ao vivo</h3>
                    <p>Os criadores podem estar offline agora</p>
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
                         loading="lazy"
                         onerror="this.src='https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-300x300.png'">
                    <div class="viewer-count">👁️ ${this.formatNumber(creator.liveViewers)}</div>
                </div>
                <div class="stream-info">
                    <div class="streamer-info">
                        <div class="streamer-avatar">
                            <img src="${creator.avatar}" alt="${creator.name}"
                                 loading="lazy"
                                 onerror="this.src='https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-300x300.png'">
                        </div>
                        <div class="streamer-details">
                            <h3>${creator.name}</h3>
                            <p>${creator.platforms.twitch ? `@${creator.platforms.twitch}` : creator.platforms.youtube?.handle || ''}</p>
                        </div>
                    </div>
                    <div class="stream-title">${creator.liveTitle}</div>
                    <a href="https://twitch.tv/${creator.platforms.twitch}" target="_blank" class="watch-live-btn">
                        <i class="fas fa-play"></i> Assistir
                    </a>
                </div>
            </div>
        `).join('');
    }

    renderAllCreators() {
        const grid = document.getElementById('all-creators-grid');
        let filteredCreators = this.creators;

        switch (this.currentFilter) {
            case 'twitch': filteredCreators = this.creators.filter(c => c.platforms.twitch); break;
            case 'youtube': filteredCreators = this.creators.filter(c => c.platforms.youtube); break;
            case 'live': filteredCreators = this.creators.filter(c => c.isLive); break;
        }

        grid.innerHTML = filteredCreators.map(creator => this.createCompactCard(creator)).join('');
    }

    // Card COMPACTO com YouTube + Twitch (como você gostou)
    createCompactCard(creator) {
        const isLive = creator.isLive;
        const hasYouTube = !!creator.platforms.youtube;
        const hasTwitch = !!creator.platforms.twitch;

        const subscribers = creator.youtubeData?.statistics?.subscriberCount || 0;
        const videos = creator.youtubeData?.statistics?.videoCount || 0;

        return `
            <div class="creator-card-compact ${isLive ? 'live' : ''}">
                <div class="creator-avatar-compact">
                    <img src="${creator.avatar}" alt="${creator.name}" 
                         loading="lazy"
                         onerror="this.src='https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-300x300.png'">
                    ${isLive ? '<div class="live-indicator"></div>' : ''}
                </div>
                
                <div class="creator-info-compact">
                    <h4 class="creator-name-compact">${creator.name}</h4>
                    <p class="creator-description-compact">${creator.description}</p>
                    
                    <div class="platforms-compact">
                        ${hasTwitch ? `<span class="platform-badge twitch">Twitch</span>` : ''}
                        ${hasYouTube ? `<span class="platform-badge youtube">YouTube</span>` : ''}
                    </div>

                    <div class="stats-compact">
                        ${isLive ? `
                            <div class="live-stats-compact">
                                <span class="viewers">👁️ ${this.formatNumber(creator.liveViewers)}</span>
                                <span class="live-badge-small">● LIVE</span>
                            </div>
                        ` : ''}
                        
                        ${hasYouTube ? `
                            <div class="youtube-stats-compact">
                                <span>👥 ${this.formatNumber(subscribers)}</span>
                                <span>🎬 ${this.formatNumber(videos)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="actions-compact">
                    ${hasTwitch ? `
                        <a href="https://twitch.tv/${creator.platforms.twitch}" target="_blank" 
                           class="action-btn-compact twitch ${isLive ? 'live' : ''}">
                            ${isLive ? '🔴 Assistir' : 'Twitch'}
                        </a>
                    ` : ''}
                    
                    ${hasYouTube ? `
                        <a href="https://youtube.com/${creator.platforms.youtube?.handle || 'channel/' + creator.platforms.youtube?.id}" 
                           target="_blank" class="action-btn-compact youtube">
                            YouTube
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Utilitários (mantidos)
    formatNumber(num) {
        if (!num || num === 'N/A') return '0';
        const number = parseInt(num);
        if (isNaN(number)) return '0';
        if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
        if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
        return number.toString();
    }

    formatRelativeTime(dateString) {
        if (!dateString) return '';
        // ... mesmo código anterior
    }

    setupEventListeners() {
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.view;
                this.renderAllCreators();
            });
        });

        // Refresh manual
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'refresh-btn';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        refreshBtn.title = 'Atualizar streams';
        refreshBtn.onclick = () => this.refreshData();

        const creatorsHeader = document.querySelector('.creators-header');
        if (creatorsHeader) {
            creatorsHeader.appendChild(refreshBtn);
        }
    }

    async refreshData() {
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) refreshBtn.classList.add('refreshing');

        await this.loadAllCreatorsFast();
        this.renderAllViews();

        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.classList.add('refreshed');
            setTimeout(() => refreshBtn.classList.remove('refreshed'), 1000);
        }
    }
}

// Inicialização RÁPIDA
document.addEventListener('DOMContentLoaded', () => {
    window.streamersManager = new StreamersManager();
    window.streamersManager.init();
});