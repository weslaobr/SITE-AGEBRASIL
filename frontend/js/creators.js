// Configuração dos canais
const YOUTUBE_CHANNELS = [
    {
        id: 'UCd54zjiewBgbTQHV_jbmM-Q',  // CaioFora
        name: 'CaioFora',
        handle: '@caiofora'
    },
    {
        id: 'UC68u_vTF3ynM1plO_kihJ0Q',  // Gks AOE
        name: 'Gks',
        handle: '@gks_aoe'
    },
    {
        id: 'UCrAbkIFpoh8EZWof6y6DfmA',  // Vicentin
        name: 'VicentiN',
        handle: '@vitorvicentin'
    },
    {
        id: 'UClTZTtes7vCnMNbU_PTWFcQ',  // Utinowns (preciso do ID correto)
        name: 'Utinowns',
        handle: '@utinowns9776'
    }
];

const TWITCH_CHANNELS = ['gks_aoe', 'legowzz', 'nyxel_tv', 'ericbr_', 'utinowns', 'vicentin', 'vitruvius_tv', 'cai0fora'];

// Chaves da API (em produção, isso deve estar no backend)
const YOUTUBE_API_KEY = 'AIzaSyDCl2JCPqjLMsCIA1Drx4PmcX2z_7hD74I';
const TWITCH_CLIENT_ID = '1xonc7u6pf71n3ikmrvwsg0usr9cth';
const TWITCH_CLIENT_SECRET = '7p4pnm9xfgdrpaxt96n180v4vdoerm';

class CreatorsManager {
    constructor() {
        this.creators = [];
        this.twitchAccessToken = null;
        this.currentView = 'all';
    }

    async init() {
        await this.getTwitchAccessToken();
        await this.loadAllCreators();
        this.renderLiveStreams();
        this.renderAllCreators();
        this.setupEventListeners();
    }

    // Autenticação Twitch
    async getTwitchAccessToken() {
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
            });

            const data = await response.json();
            this.twitchAccessToken = data.access_token;
        } catch (error) {
            console.error('Erro ao obter token Twitch:', error);
        }
    }

    // Buscar dados do YouTube
    async fetchYouTubeData(channel) {
        try {
            // Buscar informações do canal
            const channelResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channel.id}&key=${YOUTUBE_API_KEY}`
            );
            const channelData = await channelResponse.json();

            if (!channelData.items || channelData.items.length === 0) {
                throw new Error('Canal não encontrado');
            }

            const channelInfo = channelData.items[0];

            // Buscar último vídeo
            const videosResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.id}&maxResults=1&order=date&type=video&key=${YOUTUBE_API_KEY}`
            );
            const videosData = await videosResponse.json();

            return {
                platform: 'youtube',
                name: channelInfo.snippet.title,
                handle: channel.handle,
                avatar: channelInfo.snippet.thumbnails.medium.url,
                subscribers: this.formatNumber(channelInfo.statistics.subscriberCount),
                videos: this.formatNumber(channelInfo.statistics.videoCount),
                lastVideo: videosData.items && videosData.items.length > 0 ? {
                    id: videosData.items[0].id.videoId,
                    title: videosData.items[0].snippet.title,
                    thumbnail: videosData.items[0].snippet.thumbnails.medium.url,
                    publishedAt: videosData.items[0].snippet.publishedAt,
                    views: 'Carregando...'
                } : null,
                url: `https://youtube.com/channel/${channel.id}`
            };
        } catch (error) {
            console.error(`Erro ao buscar dados do YouTube para ${channel.name}:`, error);
            return null;
        }
    }

    // Buscar dados do Twitch
    async fetchTwitchData(username) {
        if (!this.twitchAccessToken) return null;

        try {
            // Buscar informações do usuário
            const userResponse = await fetch(
                `https://api.twitch.tv/helix/users?login=${username}`,
                {
                    headers: {
                        'Client-ID': TWITCH_CLIENT_ID,
                        'Authorization': `Bearer ${this.twitchAccessToken}`
                    }
                }
            );
            const userData = await userResponse.json();

            if (!userData.data || userData.data.length === 0) {
                throw new Error('Usuário não encontrado');
            }

            const userInfo = userData.data[0];

            // Buscar informações de stream
            const streamResponse = await fetch(
                `https://api.twitch.tv/helix/streams?user_login=${username}`,
                {
                    headers: {
                        'Client-ID': TWITCH_CLIENT_ID,
                        'Authorization': `Bearer ${this.twitchAccessToken}`
                    }
                }
            );
            const streamData = await streamResponse.json();

            const isLive = streamData.data && streamData.data.length > 0;
            const streamInfo = isLive ? streamData.data[0] : null;

            return {
                platform: 'twitch',
                name: userInfo.display_name,
                handle: `@${userInfo.login}`,
                avatar: userInfo.profile_image_url,
                followers: this.formatNumber(userInfo.view_count),
                isLive: isLive,
                stream: isLive ? {
                    title: streamInfo.title,
                    viewers: this.formatNumber(streamInfo.viewer_count),
                    game: streamInfo.game_name,
                    thumbnail: streamInfo.thumbnail_url.replace('{width}', '320').replace('{height}', '180')
                } : null,
                url: `https://twitch.tv/${username}`
            };
        } catch (error) {
            console.error(`Erro ao buscar dados do Twitch para ${username}:`, error);
            return null;
        }
    }

    // Carregar todos os criadores
    async loadAllCreators() {
        this.creators = [];

        // Carregar canais do YouTube
        for (const channel of YOUTUBE_CHANNELS) {
            const data = await this.fetchYouTubeData(channel);
            if (data) this.creators.push(data);
        }

        // Carregar canais do Twitch
        for (const username of TWITCH_CHANNELS) {
            const data = await this.fetchTwitchData(username);
            if (data) this.creators.push(data);
        }

        // Ordenar por plataforma (YouTube primeiro) e depois por nome
        this.creators.sort((a, b) => {
            if (a.platform !== b.platform) {
                return a.platform === 'youtube' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }

    // Renderizar streams ao vivo em destaque
    renderLiveStreams() {
        const container = document.getElementById('live-streams-container');
        const liveStreams = this.creators.filter(creator =>
            creator.platform === 'twitch' && creator.isLive
        );

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

        container.innerHTML = liveStreams.map(stream => `
            <div class="live-stream-card">
                <div class="live-badge">AO VIVO</div>
                <div class="stream-preview" onclick="window.open('${stream.url}', '_blank')">
                    <img src="${stream.stream.thumbnail}" alt="${stream.stream.title}">
                    <div class="viewer-count">👁️ ${stream.stream.viewers}</div>
                </div>
                <div class="stream-info">
                    <div class="streamer-info">
                        <div class="streamer-avatar">
                            <img src="${stream.avatar}" alt="${stream.name}">
                        </div>
                        <div class="streamer-details">
                            <h3>${stream.name}</h3>
                            <p>${stream.handle}</p>
                        </div>
                    </div>
                    <div class="stream-title">${stream.stream.title}</div>
                    <a href="${stream.url}" target="_blank" class="watch-live-btn">
                        <i class="fas fa-play"></i> Assistir Transmissão
                    </a>
                </div>
            </div>
        `).join('');
    }

    // Renderizar todos os criadores (layout compacto)
    renderAllCreators() {
        const grid = document.getElementById('all-creators-grid');
        let filteredCreators = this.creators;

        // Aplicar filtro
        if (this.currentView === 'youtube') {
            filteredCreators = this.creators.filter(creator => creator.platform === 'youtube');
        } else if (this.currentView === 'twitch') {
            filteredCreators = this.creators.filter(creator => creator.platform === 'twitch');
        }

        if (filteredCreators.length === 0) {
            grid.innerHTML = `
                <div class="error" style="grid-column: 1 / -1;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Nenhum criador encontrado</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filteredCreators.map(creator => this.createCompactCard(creator)).join('');
    }

    // Criar card compacto
    createCompactCard(creator) {
        const isLive = creator.platform === 'twitch' && creator.isLive;

        return `
            <div class="creator-card-compact ${isLive ? 'live' : ''}">
                <div class="creator-avatar-compact">
                    <img src="${creator.avatar}" alt="${creator.name}">
                    ${isLive ? '<div class="live-indicator"></div>' : ''}
                </div>
                
                <div class="creator-info-compact">
                    <h4 class="creator-name-compact">${creator.name}</h4>
                    <p class="creator-handle-compact">${creator.handle}</p>
                    <div class="creator-stats-compact">
                        <span class="platform-badge ${creator.platform}">
                            ${creator.platform === 'youtube' ? '📺 YouTube' : '🎮 Twitch'}
                        </span>
                        ${creator.platform === 'youtube' ?
                `<span>${creator.subscribers} inscritos</span>` :
                `<span>${creator.followers} seguidores</span>`
            }
                    </div>
                </div>
                
                <a href="${creator.url}" target="_blank" class="watch-btn-compact ${creator.platform} ${isLive ? 'live' : ''}">
                    ${isLive ? '🔴 LIVE' : (creator.platform === 'youtube' ? 'Ver Canal' : 'Ver Perfil')}
                </a>
            </div>
        `;
    }

    // Configurar event listeners para os filtros
    setupEventListeners() {
        const toggleButtons = document.querySelectorAll('.toggle-btn');

        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remover classe active de todos
                toggleButtons.forEach(btn => btn.classList.remove('active'));
                // Adicionar classe active ao botão clicado
                button.classList.add('active');
                // Atualizar view atual
                this.currentView = button.dataset.view;
                // Re-renderizar
                this.renderAllCreators();
            });
        });
    }

    // Renderizar criadores
    renderCreators() {
        const grid = document.getElementById('creators-grid');

        if (this.creators.length === 0) {
            grid.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Não foi possível carregar os criadores</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.creators.map(creator => this.createCreatorCard(creator)).join('');
    }

    // Criar card do criador
    createCreatorCard(creator) {
        if (creator.platform === 'youtube') {
            return this.createYouTubeCard(creator);
        } else {
            return this.createTwitchCard(creator);
        }
    }

    createYouTubeCard(creator) {
        const lastVideo = creator.lastVideo ? `
            <div class="last-video" onclick="window.open('https://youtube.com/watch?v=${creator.lastVideo.id}', '_blank')">
                <div class="video-thumbnail">
                    <img src="${creator.lastVideo.thumbnail}" alt="${creator.lastVideo.title}">
                    <div class="video-duration">--:--</div>
                </div>
                <div class="video-info">
                    <h4 class="video-title">${creator.lastVideo.title}</h4>
                    <div class="video-meta">
                        <span class="video-views">${creator.lastVideo.views}</span>
                        <span class="video-time">${this.formatTime(creator.lastVideo.publishedAt)}</span>
                    </div>
                </div>
            </div>
        ` : '<p style="color: #a0aec0; text-align: center; padding: 1rem;">Nenhum vídeo recente</p>';

        return `
            <div class="creator-card">
                <div class="creator-header">
                    <div class="creator-platform youtube">
                        <i class="fab fa-youtube"></i>
                    </div>
                    <div class="creator-avatar">
                        <img src="${creator.avatar}" alt="${creator.name}">
                    </div>
                    <div class="creator-info">
                        <h3 class="creator-name">${creator.name}</h3>
                        <p class="creator-handle">${creator.handle}</p>
                    </div>
                </div>
                
                <div class="creator-stats">
                    <div class="creator-stat">
                        <span class="stat-label">Inscritos</span>
                        <span class="stat-value">${creator.subscribers}</span>
                    </div>
                    <div class="creator-stat">
                        <span class="stat-label">Vídeos</span>
                        <span class="stat-value">${creator.videos}</span>
                    </div>
                </div>

                ${lastVideo}
                
                <a href="${creator.url}" target="_blank" class="watch-btn youtube">
                    <i class="fab fa-youtube"></i>
                    Ver Canal
                </a>
            </div>
        `;
    }

    createTwitchCard(creator) {
        const streamInfo = creator.isLive ? `
            <div class="last-video" onclick="window.open('${creator.url}', '_blank')">
                <div class="video-thumbnail">
                    <img src="${creator.stream.thumbnail}" alt="${creator.stream.title}">
                    <div class="video-duration">LIVE</div>
                </div>
                <div class="video-info">
                    <h4 class="video-title">${creator.stream.title}</h4>
                    <div class="video-meta">
                        <span class="video-views">${creator.stream.viewers} viewers</span>
                        <span class="video-time">${creator.stream.game}</span>
                    </div>
                </div>
            </div>
        ` : '<p style="color: #a0aec0; text-align: center; padding: 1rem;">Offline</p>';

        return `
            <div class="creator-card">
                <div class="creator-header">
                    <div class="creator-platform twitch">
                        <i class="fab fa-twitch"></i>
                    </div>
                    <div class="creator-avatar">
                        <img src="${creator.avatar}" alt="${creator.name}">
                    </div>
                    <div class="creator-info">
                        <h3 class="creator-name">${creator.name}</h3>
                        <p class="creator-handle">${creator.handle}</p>
                    </div>
                </div>
                
                <div class="creator-stats">
                    <div class="creator-stat">
                        <span class="stat-label">Status</span>
                        <span class="stat-value ${creator.isLive ? 'live' : 'offline'}">
                            ${creator.isLive ? '🔴 LIVE' : '⚫ OFFLINE'}
                        </span>
                    </div>
                    <div class="creator-stat">
                        <span class="stat-label">Seguidores</span>
                        <span class="stat-value">${creator.followers}</span>
                    </div>
                </div>

                ${streamInfo}
                
                <a href="${creator.url}" target="_blank" class="watch-btn twitch">
                    <i class="fab fa-twitch"></i>
                    ${creator.isLive ? 'Assistir Live' : 'Ver Canal'}
                </a>
            </div>
        `;
    }

    // Utilitários
    formatNumber(num) {
        if (!num) return '0';
        return Intl.NumberFormat('pt-BR', {
            notation: num >= 1000000 ? 'compact' : 'standard',
            maximumFractionDigits: 1
        }).format(num);
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'hoje';
        if (diffDays === 1) return 'há 1 dia';
        if (diffDays < 7) return `há ${diffDays} dias`;
        if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
        return `há ${Math.floor(diffDays / 30)} mês${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
    }

    // Método para adicionar novos canais
    addYouTubeChannel(channelId, name, handle) {
        YOUTUBE_CHANNELS.push({ id: channelId, name, handle });
        this.refreshData();
    }

    addTwitchChannel(username) {
        TWITCH_CHANNELS.push(username);
        this.refreshData();
    }

    async refreshData() {
        await this.loadAllCreators();
        this.renderCreators();
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
    window.creatorsManager = new CreatorsManager();
    await window.creatorsManager.init();
});