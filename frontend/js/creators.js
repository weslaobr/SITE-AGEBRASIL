// Configuração dos canais
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
        id: '',  // Utinowns - Buscado dinamicamente
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

    // Buscar dados do YouTube com FALLBACK completo
    async fetchYouTubeData(channel) {
        try {
            console.log(`🎯 Tentando canal: ${channel.name}`);

            let channelId = channel.id;
            let channelInfo = null;

            // MÉTODO 1: Buscar por ID direto (se tiver ID)
            if (channelId) {
                console.log(`   📡 Método 1: Buscando por ID ${channelId}`);
                const byIdResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
                );
                const byIdData = await byIdResponse.json();

                if (byIdData.items && byIdData.items.length > 0) {
                    channelInfo = byIdData.items[0];
                    console.log(`   ✅ Sucesso via ID`);
                }
            }

            // MÉTODO 2: Buscar por handle (se Método 1 falhou ou não tem ID)
            if (!channelInfo && channel.handle) {
                console.log(`   📡 Método 2: Buscando por handle ${channel.handle}`);
                const byHandleResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${channel.handle.replace('@', '')}&key=${YOUTUBE_API_KEY}`
                );
                const byHandleData = await byHandleResponse.json();

                if (byHandleData.items && byHandleData.items.length > 0) {
                    const foundChannel = byHandleData.items[0];
                    channelId = foundChannel.id.channelId;

                    // Buscar detalhes completos com o novo ID
                    const detailResponse = await fetch(
                        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
                    );
                    const detailData = await detailResponse.json();

                    if (detailData.items && detailData.items.length > 0) {
                        channelInfo = detailData.items[0];
                        console.log(`   ✅ Sucesso via handle -> ID: ${channelId}`);
                    }
                }
            }

            // MÉTODO 3: Buscar por nome (fallback final)
            if (!channelInfo && channel.name) {
                console.log(`   📡 Método 3: Buscando por nome ${channel.name}`);
                const byNameResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${channel.name} Age of Empires IV&key=${YOUTUBE_API_KEY}`
                );
                const byNameData = await byNameResponse.json();

                if (byNameData.items && byNameData.items.length > 0) {
                    const foundChannel = byNameData.items[0];
                    channelId = foundChannel.id.channelId;

                    // Buscar detalhes completos com o novo ID
                    const detailResponse = await fetch(
                        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
                    );
                    const detailData = await detailResponse.json();

                    if (detailData.items && detailData.items.length > 0) {
                        channelInfo = detailData.items[0];
                        console.log(`   ✅ Sucesso via nome -> ID: ${channelId}`);
                    }
                }
            }

            // SE TODOS OS MÉTODOS FALHARAM
            if (!channelInfo) {
                console.log(`   ❌ Todos os métodos falharam para ${channel.name}`);
                return this.createYouTubeFallback(channel);
            }

            // Buscar último vídeo (após conseguir channelInfo)
            console.log(`   📹 Buscando último vídeo...`);
            const videosResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=1&order=date&type=video&key=${YOUTUBE_API_KEY}`
            );
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
                url: `https://youtube.com/channel/${channelId}`,
                success: true
            };

            console.log(`🎉 ${channel.name} carregado com sucesso!`);
            return result;

        } catch (error) {
            console.error(`💥 Erro em ${channel.name}:`, error);
            return this.createYouTubeFallback(channel);
        }
    }

    // Fallback quando a API do YouTube falha
    createYouTubeFallback(channel) {
        console.log(`🛡️ Usando fallback para ${channel.name}`);

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

    // Buscar dados do Twitch - VERSÃO CORRIGIDA
async function fetchTwitchData(username) {
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

        // 🔥 CORREÇÃO: Buscar seguidores (precisa de uma chamada separada)
        const followersResponse = await fetch(
            `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userInfo.id}`,
            {
                headers: {
                    'Client-ID': TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${this.twitchAccessToken}`
                }
            }
        );
        const followersData = await followersResponse.json();

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
            followers: this.formatNumber(followersData.total || 0), // 🔥 AGORA CORRETO
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
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay entre requests
    }

    // Carregar canais do Twitch
    for (const username of TWITCH_CHANNELS) {
        const data = await this.fetchTwitchData(username);
        if (data) this.creators.push(data);
        await new Promise(resolve => setTimeout(resolve, 300)); // Delay entre requests
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
        // Para Twitch, mostra viewers se estiver live, senão mostra "N/A"
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