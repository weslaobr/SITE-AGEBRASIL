// streamers-api.js - AVATARS SINCRONIZADOS
class StreamersManager {
    constructor() {
        this.creators = [];
        this.twitchAccessToken = null;
        this.currentFilter = 'all';
        this.avatarCache = new Map(); // Cache para avatares
    }

    async init() {
        console.log('🚀 Iniciando StreamersManager...');

        this.renderSkeletonUI();

        try {
            await this.getTwitchAccessToken();
            await this.loadTwitchData();
        } catch (error) {
            console.warn('⚠️ Twitch falhou, usando dados estáticos:', error);
            this.loadStaticData();
        }

        this.renderAllViews();
        this.setupEventListeners();
    }

    // Carregar dados Twitch (AGORA COM AVATARS)
    async loadTwitchData() {
        const twitchUsernames = CREATORS_CONFIG.map(creator => creator.twitch);

        try {
            // Buscar streams ao vivo E informações dos usuários
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

            // Criar mapas para acesso rápido
            const streamsMap = new Map();
            streamsData.data?.forEach(stream => {
                streamsMap.set(stream.user_login.toLowerCase(), stream);
            });

            const usersMap = new Map();
            usersData.data?.forEach(user => {
                usersMap.set(user.login.toLowerCase(), user);
                // Cache do avatar
                this.avatarCache.set(user.login.toLowerCase(), user.profile_image_url);
            });

            // Combinar dados - AGORA COM AVATARS REAIS
            this.creators = CREATORS_CONFIG.map(creator => {
                const twitchUser = usersMap.get(creator.twitch.toLowerCase());
                const twitchStream = streamsMap.get(creator.twitch.toLowerCase());

                // Avatar REAL da Twitch
                const avatar = twitchUser?.profile_image_url || this.getFallbackAvatar(creator.name);

                return {
                    ...creator,
                    avatar: avatar,
                    isLive: !!twitchStream,
                    liveViewers: twitchStream?.viewer_count || 0,
                    liveTitle: twitchStream?.title || 'Age of Empires IV',
                    lastStream: this.formatRelativeTime(twitchStream?.started_at)
                };
            });

        } catch (error) {
            console.error('❌ Erro ao carregar dados Twitch:', error);
            this.loadStaticData();
        }
    }

    // Fallback avatares (apenas se Twitch falhar)
    getFallbackAvatar(name) {
        const fallbackAvatars = {
            'Gks': 'https://static-cdn.jtvnw.net/jtv_user_pictures/asmongold-profile_image-f7ddcbd0332f5d28-300x300.png',
            'CaioFora': 'https://static-cdn.jtvnw.net/jtv_user_pictures/xqcow-profile_image-9298dca608632101-300x300.jpeg',
            'VicentiN': 'https://static-cdn.jtvnw.net/jtv_user_pictures/summit1g-profile_image-7e7d2f64e08cae0a-300x300.png',
            'Utinowns': 'https://static-cdn.jtvnw.net/jtv_user_pictures/tfue-profile_image-7e7d2f64e08cae0a-300x300.png',
            'EricBR': 'https://static-cdn.jtvnw.net/jtv_user_pictures/nickmercs-profile_image-5e7d2f64e08cae0a-300x300.png',
            'Vitruvius TV': 'https://static-cdn.jtvnw.net/jtv_user_pictures/timthetatman-profile_image-5e7d2f64e08cae0a-300x300.png',
            'Nyxel TV': 'https://static-cdn.jtvnw.net/jtv_user_pictures/lirik-profile_image-5e7d2f64e08cae0a-300x300.png',
            'LegoWzz': 'https://static-cdn.jtvnw.net/jtv_user_pictures/shodan-profile_image-5e7d2f64e08cae0a-300x300.png'
        };
        return fallbackAvatars[name] || 'https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-300x300.png';
    }

    // Dados estáticos com fallback
    loadStaticData() {
        this.creators = CREATORS_CONFIG.map(creator => ({
            ...creator,
            avatar: this.getFallbackAvatar(creator.name),
            isLive: false,
            liveViewers: 0,
            liveTitle: 'Age of Empires IV',
            lastStream: 'Offline'
        }));
    }

    // Card ATUALIZADO com avatar sincronizado
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

    formatRelativeTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `Há ${diffMins} min`;
        if (diffHours < 24) return `Há ${diffHours} h`;
        return 'Hoje';
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

        // Auto-refresh a cada 3 minutos
        setInterval(() => {
            this.loadTwitchData().then(() => {
                this.renderAllViews();
            });
        }, 180000);
    }
}

    // Função para forçar atualização de avatares
    async refreshAvatars() {
    try {
        await this.loadTwitchData();
        this.renderAllViews();
        console.log('✅ Avatares atualizados');
    } catch (error) {
        console.error('❌ Erro ao atualizar avatares:', error);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.streamersManager = new StreamersManager();
    window.streamersManager.init();

    // Atualizar avatares a cada 10 minutos (opcional)
    setInterval(() => {
        window.streamersManager.refreshAvatars();
    }, 600000);
});