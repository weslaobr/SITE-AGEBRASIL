// streamers-api.js - CARDS ESTÁTICOS + LIVES DINÂMICAS
class StreamersManager {
    constructor() {
        this.creators = [];
        this.twitchAccessToken = null;
        this.currentFilter = 'all';
        this.avatarCache = new Map();
    }

    async init() {
        console.log('🚀 Iniciando Sistema Híbrido...');

        // 1. Renderizar cards estáticos IMEDIATAMENTE
        this.renderStaticCreators();

        // 2. Buscar lives em segundo plano
        this.loadLiveStreams();

        this.setupEventListeners();
    }

    // CARDS ESTÁTICOS - Carregamento instantâneo
    async renderStaticCreators() {
        console.log('📋 Renderizando cards estáticos...');

        // Inicializar com dados estáticos
        this.creators = CREATORS_CONFIG.map(creator => ({
            ...creator,
            avatar: this.getTwitchAvatarUrl(creator.twitch),
            isLive: false, // Inicialmente offline
            liveViewers: 0,
            liveTitle: 'Age of Empires IV'
        }));

        // Renderizar cards imediatamente
        this.renderAllCreators();

        // Buscar avatares da Twitch em segundo plano
        this.loadTwitchAvatars();
    }

    // URL do avatar da Twitch (formato padrão)
    getTwitchAvatarUrl(username) {
        return `https://static-cdn.jtvnw.net/jtv_user_pictures/${username}-profile_image-300x300.png`;
    }

    // Buscar avatares reais da Twitch em segundo plano
    async loadTwitchAvatars() {
        try {
            await this.getTwitchAccessToken();

            const twitchUsernames = CREATORS_CONFIG.map(creator => creator.twitch);
            const response = await fetch(
                `https://api.twitch.tv/helix/users?${twitchUsernames.map(u => `login=${u}`).join('&')}`,
                {
                    headers: {
                        'Client-ID': CONFIG.TWITCH.CLIENT_ID,
                        'Authorization': `Bearer ${this.twitchAccessToken}`
                    }
                }
            );

            const data = await response.json();

            if (data.data) {
                // Atualizar avatares com URLs reais
                data.data.forEach(user => {
                    const creator = this.creators.find(c => c.twitch.toLowerCase() === user.login.toLowerCase());
                    if (creator) {
                        creator.avatar = user.profile_image_url;
                        this.avatarCache.set(user.login.toLowerCase(), user.profile_image_url);
                    }
                });

                // Re-renderizar com avatares reais
                this.renderAllCreators();
                console.log('✅ Avatares atualizados');
            }

        } catch (error) {
            console.warn('⚠️ Não foi possível carregar avatares Twitch:', error);
            // Mantém os avatares padrão
        }
    }

    // SISTEMA DE LIVES - Dinâmico
    async loadLiveStreams() {
        try {
            await this.getTwitchAccessToken();

            const twitchUsernames = CREATORS_CONFIG.map(creator => creator.twitch);
            const response = await fetch(
                `https://api.twitch.tv/helix/streams?${twitchUsernames.map(u => `user_login=${u}`).join('&')}&first=100`,
                {
                    headers: {
                        'Client-ID': CONFIG.TWITCH.CLIENT_ID,
                        'Authorization': `Bearer ${this.twitchAccessToken}`
                    }
                }
            );

            const data = await response.json();

            if (data.data) {
                // Atualizar status de live
                const liveStreams = data.data;

                this.creators.forEach(creator => {
                    const stream = liveStreams.find(s =>
                        s.user_login.toLowerCase() === creator.twitch.toLowerCase()
                    );

                    if (stream) {
                        creator.isLive = true;
                        creator.liveViewers = stream.viewer_count;
                        creator.liveTitle = stream.title;
                    } else {
                        creator.isLive = false;
                        creator.liveViewers = 0;
                    }
                });

                // Atualizar UI
                this.renderLiveStreams();
                this.renderAllCreators();
                console.log('🎮 Status de lives atualizado');
            }

        } catch (error) {
            console.warn('⚠️ Não foi possível carregar lives:', error);
        }
    }

    // Autenticação Twitch (apenas para lives e avatares)
    async getTwitchAccessToken() {
        if (this.twitchAccessToken) return;

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
        } catch (error) {
            console.error('❌ Erro Twitch auth:', error);
            throw error;
        }
    }

    // RENDERIZAÇÃO
    renderSkeletonUI() {
        const liveContainer = document.getElementById('live-streams-container');
        const creatorsGrid = document.getElementById('all-creators-grid');

        liveContainer.innerHTML = `
            <div class="skeleton-streams">
                ${Array(2).fill().map(() => `
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

    renderLiveStreams() {
        const container = document.getElementById('live-streams-container');
        const liveStreams = this.creators.filter(creator => creator.isLive);

        if (liveStreams.length === 0) {
            container.innerHTML = `
                <div class="no-live-streams">
                    <i class="fas fa-tv"></i>
                    <h3>Nenhuma transmissão ao vivo</h3>
                    <p>Quando um criador estiver online, aparecerá aqui!</p>
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
                <div class="stream-preview" onclick="window.open('https://twitch.tv/${creator.twitch}', '_blank')">
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
                            <p>@${creator.twitch}</p>
                        </div>
                    </div>
                    <div class="stream-title">${creator.liveTitle}</div>
                    <a href="https://twitch.tv/${creator.twitch}" target="_blank" class="watch-live-btn">
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
            case 'twitch': filteredCreators = this.creators.filter(c => c.twitch); break;
            case 'youtube': filteredCreators = this.creators.filter(c => c.youtube); break;
            case 'live': filteredCreators = this.creators.filter(c => c.isLive); break;
        }

        grid.innerHTML = filteredCreators.map(creator => this.createCreatorCard(creator)).join('');
    }

    createCreatorCard(creator) {
        const isLive = creator.isLive;
        const hasYouTube = !!creator.youtube;
        const hasTwitch = !!creator.twitch;

        return `
            <div class="creator-card ${isLive ? 'live' : ''}">
                <div class="creator-header">
                    <div class="creator-avatar">
                        <img src="${creator.avatar}" alt="${creator.name}" 
                             loading="lazy"
                             onerror="this.src='https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-300x300.png'">
                        ${isLive ? '<div class="live-indicator"></div>' : ''}
                    </div>
                    <div class="platform-icons">
                        ${hasTwitch ? '<span class="platform-icon twitch" title="Twitch">🎮</span>' : ''}
                        ${hasYouTube ? '<span class="platform-icon youtube" title="YouTube">📺</span>' : ''}
                    </div>
                </div>

                <div class="creator-info">
                    <h4 class="creator-name">${creator.name}</h4>
                    <p class="creator-handle">@${creator.twitch}</p>
                    <p class="creator-description">${creator.description}</p>
                    
                    <div class="specialty-tags">
                        ${creator.specialty.map(spec =>
            `<span class="tag">${spec}</span>`
        ).join('')}
                    </div>

                    <div class="creator-stats">
                        ${isLive ? `
                            <div class="live-stats">
                                <span class="viewers">👁️ ${this.formatNumber(creator.liveViewers)} viewers</span>
                                <span class="live-status">● AO VIVO</span>
                            </div>
                        ` : `
                            <div class="offline-stats">
                                <span class="offline-text">📡 Offline</span>
                            </div>
                        `}
                    </div>
                </div>

                <div class="creator-actions">
                    ${hasTwitch ? `
                        <a href="https://twitch.tv/${creator.twitch}" target="_blank" 
                           class="action-btn twitch ${isLive ? 'live' : ''}">
                            ${isLive ? '🔴 Assistir' : 'Twitch'}
                        </a>
                    ` : ''}
                    
                    ${hasYouTube ? `
                        <a href="${creator.youtube}" target="_blank" 
                           class="action-btn youtube">
                            YouTube
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Utilitários
    formatNumber(num) {
        if (!num) return '0';
        const number = parseInt(num);
        if (isNaN(number)) return '0';
        if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
        if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
        return number.toString();
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

        // Auto-refresh das lives a cada 2 minutos
        setInterval(() => {
            this.loadLiveStreams();
        }, 120000);
    }
}

// Inicialização RÁPIDA
document.addEventListener('DOMContentLoaded', () => {
    window.streamersManager = new StreamersManager();
    window.streamersManager.init();
});