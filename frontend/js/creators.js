// Configuração dos canais - COM 4 CANAIS
const YOUTUBE_CHANNELS = [
    {
        id: 'UCd54zjiewBgbTQHV_jbmM-Q',  // CaioFora - CONFIRMADO
        name: 'CaioFora',
        handle: '@caiofora'
    },
    {
        id: 'UCXAmHA4lVgVY7ndp6lqaS7A',  // Gks - CONFIRMADO
        name: 'Gks',
        handle: '@gks_aoe'
    },
    {
        id: 'UCrAbkIFpoh8EZWof6y6DfmA',  // Vicentin - CONFIRMADO
        name: 'VicentiN',
        handle: '@vitorvicentin'
    },
    {
        id: 'UCqjTl4yd5LQHsxJgLtqkS3A',  // Utinowns - ID PROVISÓRIO
        name: 'Utinowns',
        handle: '@utinowns9776'
    }
];

// Chaves da API
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

    // Sistema de Cache
    saveToCache(key, data, duration) {
        try {
            const cacheData = {
                data: data,
                expiry: Date.now() + duration
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
        } catch (error) {
            console.log('Erro ao salvar cache:', error);
        }
    }

    getFromCache(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            if (Date.now() > cacheData.expiry) {
                localStorage.removeItem(key);
                return null;
            }

            return cacheData.data;
        } catch (error) {
            console.log('Erro ao ler cache:', error);
            return null;
        }
    }

    // Buscar dados do YouTube - VERSÃO SIMPLIFICADA E CONFIÁVEL
    async fetchYouTubeData(channel) {
        // Verificar cache primeiro (10 minutos)
        const cacheKey = `yt_${channel.id}`;
        const cached = this.getFromCache(cacheKey);

        if (cached) {
            console.log(`📦 Cache: ${channel.name}`);
            return cached;
        }

        try {
            console.log(`🎯 Buscando: ${channel.name} (ID: ${channel.id})`);

            // Buscar dados do canal
            const channelResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channel.id}&key=${YOUTUBE_API_KEY}`
            );

            if (!channelResponse.ok) {
                throw new Error(`HTTP error! status: ${channelResponse.status}`);
            }

            const channelData = await channelResponse.json();

            if (!channelData.items || channelData.items.length === 0) {
                console.log(`❌ Canal não encontrado: ${channel.name}`);
                // Tentar buscar ID correto
                const correctedChannel = await this.findCorrectChannelId(channel);
                if (correctedChannel) {
                    return await this.fetchYouTubeData(correctedChannel);
                }
                return this.createYouTubeFallback(channel);
            }

            const channelInfo = channelData.items[0];

            // Buscar último vídeo
            const videosResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.id}&maxResults=1&order=date&type=video&key=${YOUTUBE_API_KEY}`
            );

            if (!videosResponse.ok) {
                throw new Error(`HTTP error! status: ${videosResponse.status}`);
            }

            const videosData = await videosResponse.json();

            const result = {
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
                url: `https://youtube.com/channel/${channel.id}`,
                success: true
            };

            // Salvar no cache (10 minutos)
            this.saveToCache(cacheKey, result, 10 * 60 * 1000);
            console.log(`✅ Sucesso: ${channel.name}`);
            return result;

        } catch (error) {
            console.error(`💥 Erro em ${channel.name}:`, error);

            // Tentar usar cache mesmo com erro
            const fallbackCache = this.getFromCache(cacheKey);
            if (fallbackCache) {
                console.log(`🛡️ Cache de fallback: ${channel.name}`);
                return fallbackCache;
            }

            return this.createYouTubeFallback(channel);
        }
    }

    // Tentar encontrar ID correto do canal
    async findCorrectChannelId(channel) {
        try {
            console.log(`🔍 Tentando encontrar ID correto para: ${channel.name}`);

            const searchResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${channel.handle.replace('@', '')}&key=${YOUTUBE_API_KEY}`
            );

            if (!searchResponse.ok) return null;

            const searchData = await searchResponse.json();

            if (searchData.items && searchData.items.length > 0) {
                const foundChannel = searchData.items[0];
                const newId = foundChannel.id.channelId;
                console.log(`🎯 ID encontrado para ${channel.name}: ${newId}`);

                // Atualizar o canal com novo ID
                return {
                    ...channel,
                    id: newId
                };
            }
        } catch (error) {
            console.error(`Erro ao buscar ID para ${channel.name}:`, error);
        }

        return null;
    }

    // Fallback quando a API do YouTube falha
    createYouTubeFallback(channel) {
        console.log(`🛡️ Fallback: ${channel.name}`);

        return {
            platform: 'youtube',
            name: channel.name,
            handle: channel.handle,
            avatar: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=YT',
            subscribers: 'N/A',
            videos: 'N/A',
            lastVideo: null,
            url: `https://youtube.com/${channel.handle}`,
            success: false,
            isFallback: true
        };
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
                followers: 'N/A', // API não permite buscar followers facilmente
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
            await new Promise(resolve => setTimeout(resolve, 1500)); // Delay maior entre requests
        }

        // Carregar canais do Twitch
        for (const username of TWITCH_CHANNELS) {
            const data = await this.fetchTwitchData(username);
            if (data) this.creators.push(data);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Ordenar: YouTube primeiro, depois Twitch, e por nome
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
        const isFallback = creator.isFallback;

        // Informações específicas por plataforma
        let statsText = '';
        if (creator.platform === 'youtube') {
            statsText = `${creator.subscribers} inscritos`;
        } else {
            statsText = isLive ? `${creator.stream.viewers} viewers` : 'Offline';
        }

        return `
            <div class="creator-card-compact ${isLive ? 'live' : ''} ${isFallback ? 'fallback' : ''}">
                <div class="creator-avatar-compact">
                    <img src="${creator.avatar}" alt="${creator.name}">
                    ${isLive ? '<div class="live-indicator"></div>' : ''}
                    ${isFallback ? '<div class="fallback-indicator">⚠️</div>' : ''}
                </div>
                
                <div class="creator-info-compact">
                    <h4 class="creator-name-compact">${creator.name}</h4>
                    <p class="creator-handle-compact">${creator.handle}</p>
                    <div class="creator-stats-compact">
                        <span class="platform-badge ${creator.platform}">
                            ${creator.platform === 'youtube' ? '📺 YouTube' : '🎮 Twitch'}
                        </span>
                        <span>${statsText}</span>
                    </div>
                </div>
                
                <a href="${creator.url}" target="_blank" class="watch-btn-compact ${creator.platform} ${isLive ? 'live' : ''} ${isFallback ? 'fallback' : ''}">
                    ${isLive ? '🔴 LIVE' : (isFallback ? 'Tentar Acessar' : (creator.platform === 'youtube' ? 'Ver Canal' : 'Ver Perfil'))}
                </a>
            </div>
        `;
    }

    // Configurar event listeners para os filtros
    setupEventListeners() {
        const toggleButtons = document.querySelectorAll('.toggle-btn');

        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                toggleButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.currentView = button.dataset.view;
                this.renderAllCreators();
            });
        });
    }

    // Utilitários
    formatNumber(num) {
        if (!num || num === 'N/A' || num === 0) return '0';
        if (typeof num === 'string' && num.includes('N/A')) return 'N/A';

        return Intl.NumberFormat('pt-BR', {
            notation: num >= 1000000 ? 'compact' : 'standard',
            maximumFractionDigits: 1
        }).format(num);
    }

    formatTime(dateString) {
        if (!dateString) return 'N/A';
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
        this.renderLiveStreams();
        this.renderAllCreators();
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
    window.creatorsManager = new CreatorsManager();
    await window.creatorsManager.init();
});