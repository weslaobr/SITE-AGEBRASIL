// streamers-api.js - VERSÃO COM FALLBACKS
class StreamersManager {
    constructor() {
        this.creators = [];
        this.twitchAccessToken = null;
        this.currentFilter = 'all';
        this.cacheDuration = 10 * 60 * 1000; // 10 minutos
        this.useFallback = false;
    }

    async init() {
        console.log('🚀 Iniciando StreamersManager...');

        // Mostrar UI instantaneamente
        this.renderSkeletonUI();

        try {
            await this.getTwitchAccessToken();
            await this.loadAllCreatorsFast();
        } catch (error) {
            console.error('❌ Erro crítico, usando fallback:', error);
            this.useFallback = true;
            await this.loadFallbackData();
        }

        this.renderAllViews();
        this.setupEventListeners();
    }

    // Sistema de Fallback para quando APIs falham
    async loadFallbackData() {
        console.log('🛡️ Usando dados fallback...');

        this.creators = CREATORS_CONFIG.map(creator => ({
            ...creator,
            avatar: this.getFallbackAvatar(creator.name),
            isLive: false, // Não sabemos online
            youtubeData: creator.platforms.youtube ? {
                statistics: {
                    subscriberCount: 'N/A',
                    videoCount: 'N/A'
                }
            } : null,
            liveViewers: 0,
            liveTitle: 'Age of Empires IV',
            lastStream: 'Indisponível'
        }));

        this.saveToCache('creators_fallback', this.creators);
    }

    getFallbackAvatar(name) {
        const avatars = {
            'Gks': 'https://static-cdn.jtvnw.net/jtv_user_pictures/asmongold-profile_image-f7ddcbd0332f5d28-300x300.png',
            'CaioFora': 'https://static-cdn.jtvnw.net/jtv_user_pictures/xqcow-profile_image-9298dca608632101-300x300.jpeg',
            'VicentiN': 'https://static-cdn.jtvnw.net/jtv_user_pictures/summit1g-profile_image-7e7d2f64e08cae0a-300x300.png',
            'Utinowns': 'https://static-cdn.jtvnw.net/jtv_user_pictures/tfue-profile_image-7e7d2f64e08cae0a-300x300.png',
            'EricBR': 'https://static-cdn.jtvnw.net/jtv_user_pictures/nickmercs-profile_image-5e7d2f64e08cae0a-300x300.png',
            'Vitruvius TV': 'https://static-cdn.jtvnw.net/jtv_user_pictures/timthetatman-profile_image-5e7d2f64e08cae0a-300x300.png',
            'Nyxel TV': 'https://static-cdn.jtvnw.net/jtv_user_pictures/lirik-profile_image-5e7d2f64e08cae0a-300x300.png',
            'LegoWzz': 'https://static-cdn.jtvnw.net/jtv_user_pictures/shodan-profile_image-5e7d2f64e08cae0a-300x300.png'
        };
        return avatars[name] || 'https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-300x300.png';
    }

    // YouTube com Proxy/fallback
    async fetchAllYouTubeData() {
        // Tentar cache primeiro
        const cached = this.getFromCache('youtube_data');
        if (cached) return cached;

        const youtubeChannels = CREATORS_CONFIG
            .filter(creator => creator.platforms.youtube)
            .map(creator => creator.platforms.youtube.id);

        if (youtubeChannels.length === 0) return [];

        try {
            console.log('📺 Buscando dados YouTube...');

            // Tentar método direto primeiro
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${youtubeChannels.join(',')}&key=${CONFIG.YOUTUBE.API_KEY}`,
                {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`YouTube API error: ${response.status}`);
            }

            const data = await response.json();
            const result = data.items || [];

            this.saveToCache('youtube_data', result);
            return result;

        } catch (error) {
            console.warn('⚠️ YouTube API falhou, usando fallback:', error);

            // Criar dados fallback para YouTube
            return youtubeChannels.map(channelId => ({
                id: channelId,
                statistics: {
                    subscriberCount: 'N/A',
                    videoCount: 'N/A'
                },
                snippet: {
                    title: 'Canal YouTube',
                    thumbnails: {
                        default: { url: this.getFallbackAvatar('YouTube') }
                    }
                }
            }));
        }
    }

    // Twitch com fallback
    async fetchAllTwitchData() {
        if (!this.twitchAccessToken) {
            return { streams: [], users: [] };
        }

        const twitchUsernames = CREATORS_CONFIG
            .filter(creator => creator.platforms.twitch)
            .map(creator => creator.platforms.twitch);

        if (twitchUsernames.length === 0) return { streams: [], users: [] };

        try {
            console.log('🎮 Buscando dados Twitch...');

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

            if (!streamsResponse.ok || !usersResponse.ok) {
                throw new Error('Twitch API error');
            }

            const [streamsData, usersData] = await Promise.all([
                streamsResponse.json(),
                usersResponse.json()
            ]);

            return {
                streams: streamsData.data || [],
                users: usersData.data || []
            };

        } catch (error) {
            console.warn('⚠️ Twitch API falhou, usando fallback:', error);

            // Fallback para Twitch
            return {
                streams: [],
                users: twitchUsernames.map(username => ({
                    login: username,
                    profile_image_url: this.getFallbackAvatar(username),
                    display_name: username
                }))
            };
        }
    }

    // Renderização com tratamento de erros
    createCompactCard(creator) {
        const isLive = creator.isLive && !this.useFallback;
        const hasYouTube = !!creator.platforms.youtube;
        const hasTwitch = !!creator.platforms.twitch;

        // Dados YouTube com fallback
        const subscribers = creator.youtubeData?.statistics?.subscriberCount;
        const videos = creator.youtubeData?.statistics?.videoCount;

        const showYouTubeStats = hasYouTube && subscribers && videos && subscribers !== 'N/A';

        return `
            <div class="creator-card-compact ${isLive ? 'live' : ''} ${this.useFallback ? 'fallback' : ''}">
                <div class="creator-avatar-compact">
                    <img src="${creator.avatar}" alt="${creator.name}" 
                         loading="lazy"
                         onerror="this.src='https://static-cdn.jtvnw.net/jtv_user_pictures/unknown-user-300x300.png'">
                    ${isLive ? '<div class="live-indicator"></div>' : ''}
                    ${this.useFallback ? '<div class="fallback-badge">⚠️</div>' : ''}
                </div>
                
                <div class="creator-info-compact">
                    <h4 class="creator-name-compact">${creator.name}</h4>
                    <p class="creator-description-compact">${creator.description}</p>
                    
                    <div class="specialty-tags-compact">
                        ${creator.specialty.map(spec =>
            `<span class="tag-compact">${spec}</span>`
        ).join('')}
                    </div>

                    <div class="stats-compact">
                        ${isLive ? `
                            <div class="live-stats-compact">
                                <span class="viewers">👁️ ${this.formatNumber(creator.liveViewers)}</span>
                                <span class="live-badge-small">● LIVE</span>
                            </div>
                        ` : ''}
                        
                        ${showYouTubeStats ? `
                            <div class="youtube-stats-compact">
                                <span>👥 ${this.formatNumber(subscribers)}</span>
                                <span>🎬 ${this.formatNumber(videos)}</span>
                            </div>
                        ` : hasYouTube ? `
                            <div class="youtube-stats-compact unavailable">
                                <span>📺 YouTube conectado</span>
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