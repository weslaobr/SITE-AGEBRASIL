// Configuração dos canais - COM IDs CORRETOS
const YOUTUBE_CHANNELS = [
    {
        id: 'UCd54zjiewBgbTQHV_jbmM-Q',  // CaioFora
        name: 'CaioFora',
        handle: '@caiofora'
    },
    {
        id: 'UCXAmHA4lVgVY7ndp6lqaS7A',  // Gks
        name: 'Gks',
        handle: '@gks_aoe'
    },
    {
        id: 'UCrAbkIFpoh8EZWof6y6DfmA',  // Vicentin
        name: 'VicentiN',
        handle: '@vitorvicentin'
    },
    {
        id: 'UCqjTl4yd5LQHsxJgLtqkS3A',  // Utinowns - ID CORRETO
        name: 'Utinowns',
        handle: '@utinowns9776'
    }
];

const TWITCH_CHANNELS = ['gks_aoe', 'legowzz', 'nyxel_tv', 'ericbr_', 'utinowns', 'vicentin', 'vitruvius_tv', 'cai0fora'];

// Chaves da API
const YOUTUBE_API_KEY = 'AIzaSyDCl2JCPqjLMsCIA1Drx4PmcX2z_7hD74I';
const TWITCH_CLIENT_ID = '1xonc7u6pf71n3ikmrvwsg0usr9cth';
const TWITCH_CLIENT_SECRET = '7p4pnm9xfgdrpaxt96n180v4vdoerm';

class CreatorsManager {
    constructor() {
        this.creators = [];
        this.twitchAccessToken = null;
        this.currentView = 'all';
        this.isLoading = true;
    }

    async init() {
        console.log('🚀 Iniciando CreatorsManager...');
        await this.getTwitchAccessToken();
        await this.loadAllCreators();
        this.renderLiveStreams();
        this.renderAllCreators();
        this.setupEventListeners();
        this.isLoading = false;
    }

    // Autenticação Twitch
    async getTwitchAccessToken() {
        try {
            console.log('🔑 Obtendo token Twitch...');
            const response = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
            });

            if (!response.ok) throw new Error('Falha na autenticação Twitch');

            const data = await response.json();
            this.twitchAccessToken = data.access_token;
            console.log('✅ Token Twitch obtido com sucesso');
        } catch (error) {
            console.error('❌ Erro ao obter token Twitch:', error);
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
            console.log('⚠️ Erro ao salvar cache:', error);
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
            console.log('⚠️ Erro ao ler cache:', error);
            return null;
        }
    }

    // Buscar dados do YouTube - VERSÃO ROBUSTA
    async fetchYouTubeData(channel) {
        // Verificar cache primeiro
        const cacheKey = `yt_${channel.id}`;
        const cached = this.getFromCache(cacheKey);

        if (cached) {
            console.log(`📦 Cache: ${channel.name}`);
            return cached;
        }

        // Se não tem ID, pular busca
        if (!channel.id) {
            console.log(`⏭️  Sem ID, usando fallback: ${channel.name}`);
            return this.createYouTubeFallback(channel);
        }

        try {
            console.log(`🎯 Buscando: ${channel.name}`);

            // Buscar dados do canal com timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const channelResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channel.id}&key=${YOUTUBE_API_KEY}`,
                { signal: controller.signal }
            );

            clearTimeout(timeout);

            if (!channelResponse.ok) {
                throw new Error(`HTTP ${channelResponse.status}`);
            }

            const channelData = await channelResponse.json();

            if (!channelData.items || channelData.items.length === 0) {
                console.log(`❌ Canal não encontrado: ${channel.name}`);
                return this.createYouTubeFallback(channel);
            }

            const channelInfo = channelData.items[0];

            // Buscar último vídeo
            const videosResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.id}&maxResults=1&order=date&type=video&key=${YOUTUBE_API_KEY}`
            );

            const videosData = await videosResponse.json();

            const result = {
                platform: 'youtube',
                name: channelInfo.snippet.title,
                handle: channel.handle,
                avatar: channelInfo.snippet.thumbnails?.medium?.url || 'https://via.placeholder.com/150/FF0000/FFFFFF?text=YT',
                subscribers: this.formatNumber(channelInfo.statistics?.subscriberCount || 0),
                videos: this.formatNumber(channelInfo.statistics?.videoCount || 0),
                lastVideo: videosData.items && videosData.items.length > 0 ? {
                    id: videosData.items[0].id.videoId,
                    title: videosData.items[0].snippet.title,
                    thumbnail: videosData.items[0].snippet.thumbnails?.medium?.url || 'https://via.placeholder.com/320/180/FF0000/FFFFFF?text=Video',
                    publishedAt: videosData.items[0].snippet.publishedAt,
                    views: 'Carregando...'
                } : null,
                url: `https://youtube.com/channel/${channel.id}`,
                success: true
            };

            // Salvar no cache (15 minutos)
            this.saveToCache(cacheKey, result, 15 * 60 * 1000);
            console.log(`✅ Sucesso: ${channel.name}`);
            return result;

        } catch (error) {
            console.error(`💥 Erro em ${channel.name}:`, error.message);

            // Tentar usar cache mesmo com erro
            const fallbackCache = this.getFromCache(cacheKey);
            if (fallbackCache) {
                console.log(`🛡️ Cache de fallback: ${channel.name}`);
                return fallbackCache;
            }

            return this.createYouTubeFallback(channel);
        }
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
        if (!this.twitchAccessToken) {
            console.log(`⏭️  Sem token Twitch: ${username}`);
            return null;
        }

        try {
            console.log(`🎮 Buscando Twitch: ${username}`);

            const userResponse = await fetch(
                `https://api.twitch.tv/helix/users?login=${username}`,
                {
                    headers: {
                        'Client-ID': TWITCH_CLIENT_ID,
                        'Authorization': `Bearer ${this.twitchAccessToken}`
                    }
                }
            );

            if (!userResponse.ok) throw new Error(`HTTP ${userResponse.status}`);

            const userData = await userResponse.json();

            if (!userData.data || userData.data.length === 0) {
                console.log(`❌ Usuário Twitch não encontrado: ${username}`);
                return null;
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

            console.log(`✅ Twitch: ${username} ${isLive ? '🔴 LIVE' : '⚫ OFFLINE'}`);

            return {
                platform: 'twitch',
                name: userInfo.display_name,
                handle: `@${userInfo.login}`,
                avatar: userInfo.profile_image_url,
                followers: 'N/A',
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
            console.error(`💥 Erro no Twitch para ${username}:`, error.message);
            return null;
        }
    }

    // Carregar todos os criadores
    async loadAllCreators() {
        console.log('📥 Carregando todos os criadores...');
        this.creators = [];

        // Carregar YouTube primeiro
        console.log('📺 Carregando canais do YouTube...');
        for (const channel of YOUTUBE_CHANNELS) {
            const data = await this.fetchYouTubeData(channel);
            if (data) {
                this.creators.push(data);
                console.log(`✅ YouTube adicionado: ${channel.name}`);
            } else {
                console.log(`❌ YouTube falhou: ${channel.name}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // Carregar Twitch depois
        console.log('🎮 Carregando canais do Twitch...');
        for (const username of TWITCH_CHANNELS) {
            const data = await this.fetchTwitchData(username);
            if (data) {
                this.creators.push(data);
                console.log(`✅ Twitch adicionado: ${username}`);
            } else {
                console.log(`❌ Twitch falhou: ${username}`);
            }
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        // Ordenar
        this.creators.sort((a, b) => {
            if (a.platform !== b.platform) return a.platform === 'youtube' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        console.log(`🎉 Carregamento completo! Total: ${this.creators.length} criadores`);
        console.log(`📊 YouTube: ${this.creators.filter(c => c.platform === 'youtube').length}`);
        console.log(`📊 Twitch: ${this.creators.filter(c => c.platform === 'twitch').length}`);
    }

    // Renderizar streams ao vivo em destaque
    renderLiveStreams() {
        const container = document.getElementById('live-streams-container');
        if (!container) {
            console.error('❌ Container de live streams não encontrado!');
            return;
        }

        const liveStreams = this.creators.filter(creator =>
            creator.platform === 'twitch' && creator.isLive
        );

        console.log(`🔴 Streams ao vivo encontradas: ${liveStreams.length}`);

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
                    <img src="${stream.stream.thumbnail}" alt="${stream.stream.title}" onerror="this.src='https://via.placeholder.com/320/180/9146FF/FFFFFF?text=Twitch'">
                    <div class="viewer-count">👁️ ${stream.stream.viewers}</div>
                </div>
                <div class="stream-info">
                    <div class="streamer-info">
                        <div class="streamer-avatar">
                            <img src="${stream.avatar}" alt="${stream.name}" onerror="this.src='https://via.placeholder.com/50/9146FF/FFFFFF?text=TW'">
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

    // Renderizar todos os criadores
    renderAllCreators() {
        const grid = document.getElementById('all-creators-grid');
        if (!grid) {
            console.error('❌ Grid de criadores não encontrado!');
            return;
        }

        let filteredCreators = this.creators;

        if (this.currentView === 'youtube') {
            filteredCreators = this.creators.filter(creator => creator.platform === 'youtube');
        } else if (this.currentView === 'twitch') {
            filteredCreators = this.creators.filter(creator => creator.platform === 'twitch');
        }

        console.log(`🎨 Renderizando ${filteredCreators.length} criadores (view: ${this.currentView})`);

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
        const isYouTube = creator.platform === 'youtube';

        if (isYouTube) {
            return `
                <div class="creator-card-compact youtube ${isFallback ? 'fallback' : ''}">
                    <div class="creator-avatar-compact">
                        <img src="${creator.avatar}" alt="${creator.name}" onerror="this.src='https://via.placeholder.com/50/FF0000/FFFFFF?text=YT'">
                        ${isFallback ? '<div class="fallback-indicator">⚠️</div>' : ''}
                        <div class="platform-icon youtube">📺</div>
                    </div>
                    
                    <div class="creator-info-compact">
                        <h4 class="creator-name-compact">${creator.name}</h4>
                        <p class="creator-handle-compact">${creator.handle}</p>
                        <div class="creator-stats-compact">
                            <div class="youtube-stats">
                                <span class="stat">${creator.subscribers} inscritos</span>
                                <span class="stat">${creator.videos} vídeos</span>
                            </div>
                        </div>
                    </div>
                    
                    <a href="${creator.url}" target="_blank" class="watch-btn-compact youtube ${isFallback ? 'fallback' : ''}">
                        ${isFallback ? 'Tentar Acessar' : 'Ver Canal'}
                    </a>
                </div>
            `;
        }

        // Twitch
        let statsText = isLive ? `${creator.stream.viewers} viewers` : 'Offline';

        return `
            <div class="creator-card-compact ${isLive ? 'live' : ''}">
                <div class="creator-avatar-compact">
                    <img src="${creator.avatar}" alt="${creator.name}" onerror="this.src='https://via.placeholder.com/50/9146FF/FFFFFF?text=TW'">
                    ${isLive ? '<div class="live-indicator"></div>' : ''}
                    <div class="platform-icon twitch">🎮</div>
                </div>
                
                <div class="creator-info-compact">
                    <h4 class="creator-name-compact">${creator.name}</h4>
                    <p class="creator-handle-compact">${creator.handle}</p>
                    <div class="creator-stats-compact">
                        <span class="platform-badge twitch">Twitch</span>
                        <span>${statsText}</span>
                    </div>
                </div>
                
                <a href="${creator.url}" target="_blank" class="watch-btn-compact twitch ${isLive ? 'live' : ''}">
                    ${isLive ? '🔴 LIVE' : 'Ver Perfil'}
                </a>
            </div>
        `;
    }

    // Configurar event listeners
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

    // Métodos para adicionar canais
    addYouTubeChannel(channelId, name, handle) {
        YOUTUBE_CHANNELS.push({ id: channelId, name, handle });
        this.refreshData();
    }

    addTwitchChannel(username) {
        TWITCH_CHANNELS.push(username);
        this.refreshData();
    }

    async refreshData() {
        console.log('🔄 Atualizando dados...');
        await this.loadAllCreators();
        this.renderLiveStreams();
        this.renderAllCreators();
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏁 DOM Carregado - Iniciando CreatorsManager');
    window.creatorsManager = new CreatorsManager();
    await window.creatorsManager.init();
});