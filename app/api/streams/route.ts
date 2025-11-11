import { NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

console.log('🔧 Variáveis de ambiente:', {
  hasYouTubeKey: !!YOUTUBE_API_KEY,
  hasTwitchClientId: !!TWITCH_CLIENT_ID,
  hasTwitchSecret: !!TWITCH_CLIENT_SECRET
});

// Canais configurados
const YOUTUBE_CHANNELS = [
  { 
    id: 'UCrVkeqe_e4dKZ8v-eX1P_2A',  // CaioFora
    name: 'CaioFora',
    handle: '@caiofora'
  },
  { 
    id: 'UCXAmHA4lVgVY7ndp6lqaS7A',  // Gks AOE
    name: 'Gks',
    handle: '@gks_aoe' 
  },

  { 
    id: 'UCyQr4wo6jq5w1dHcJvqyM8g',  // Vicentin (vamos tentar encontrar um melhor)
    name: 'Vicentin',
    handle: '@vitorvicentin'
  }
];

const TWITCH_CHANNELS = ['gks_aoe', 'vicentin', 'cai0fora'];

async function getYouTubeVideos() {
  console.log('🎯 YouTube: Verificando API Key...');
  
  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY.includes('sua_api')) {
    console.log('📝 YouTube: Modo manual - API Key não configurada');
    return getManualYouTube();
  }

  try {
    console.log('📺 YouTube: Iniciando busca automática...');
    const videos = [];
    
    for (const channel of YOUTUBE_CHANNELS) {
      console.log(`   🔍 Buscando: ${channel.name}`);
      
      // 🔥 TENTAR MÚLTIPLOS MÉTODOS DE BUSCA
      const searchMethods = [
        // Método 1: Buscar por username (@handle)
        `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${encodeURIComponent(channel.name)}&part=snippet&order=date&maxResults=1&type=video`,
        // Método 2: Buscar conteúdo AOE4 do canal
        `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${encodeURIComponent(channel.name + ' aoe4')}&part=snippet&order=date&maxResults=1&type=video`
      ];
      
      let videoFound = false;
      
      for (const apiUrl of searchMethods) {
        console.log(`   🌐 Tentando: ${apiUrl.substring(0, 80)}...`);
        
        const response = await fetch(apiUrl);
        console.log(`   📡 Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   📊 Resposta: ${data.items ? data.items.length : 0} itens`);
          
          if (data.items && data.items.length > 0) {
            const video = data.items[0];
            // Verificar se é realmente do canal que queremos
            if (video.snippet.channelTitle.toLowerCase().includes(channel.name.toLowerCase())) {
              videos.push({
                id: video.id.videoId,
                title: video.snippet.title,
                channel: channel.name,
                url: `https://www.youtube.com/embed/${video.id.videoId}`,
                type: 'video' as const,
                thumbnail: video.snippet.thumbnails.medium?.url,
                live: false,
                timeAgo: getTimeAgo(video.snippet.publishedAt)
              });
              console.log(`   ✅ Vídeo encontrado: "${video.snippet.title.substring(0, 40)}..."`);
              videoFound = true;
              break; // Sai do loop se encontrou
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (!videoFound) {
        console.log(`   📭 Nenhum vídeo encontrado para ${channel.name}`);
        videos.push(getChannelFallback(channel.name));
      }
    }
    
    console.log(`📺 YouTube: ${videos.length} vídeos processados`);
    return videos;
    
  } catch (error) {
    console.log('💥 YouTube: Erro geral:', error);
    return getManualYouTube();
  }
}

async function getTwitchStreams() {
  console.log('🎯 Twitch: Verificando credenciais...');
  
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || 
      TWITCH_CLIENT_ID.includes('seu_client') || 
      TWITCH_CLIENT_SECRET.includes('seu_secret')) {
    console.log('📝 Twitch: Modo manual - Credenciais não configuradas');
    return getManualTwitch();
  }

  try {
    console.log('🎮 Twitch: Iniciando busca automática...');
    
    console.log('   🔐 Obtendo token...');
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: 'POST' }
    );
    
    console.log(`   📡 Token status: ${tokenResponse.status}`);
    
    if (!tokenResponse.ok) {
      throw new Error(`Token falhou: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('   ✅ Token obtido');
    
    console.log('   🔍 Buscando streams...');
    const streamsResponse = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${TWITCH_CHANNELS.join('&user_login=')}`,
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      }
    );
    
    console.log(`   📡 Streams status: ${streamsResponse.status}`);
    
    if (!streamsResponse.ok) {
      throw new Error(`Streams falhou: ${streamsResponse.status}`);
    }
    
    const streamsData = await streamsResponse.json();
    console.log(`   📊 ${streamsData.data?.length || 0} streams encontradas`);
    
    const liveStreams = streamsData.data?.map((stream: any) => ({
      id: stream.id,
      title: stream.title,
      channel: stream.user_name,
      url: `https://player.twitch.tv/?channel=${stream.user_name}&parent=localhost`,
      type: 'live' as const,
      thumbnail: stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180'),
      live: true,
      viewers: stream.viewer_count
    })) || [];
    
    console.log(`🎮 Twitch: ${liveStreams.length} lives ativas`);
    return liveStreams;
    
  } catch (error) {
    console.log('💥 Twitch: Erro geral:', error);
    return getManualTwitch();
  }
}

function getTimeAgo(publishedAt: string) {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffMs = now.getTime() - published.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  return 'há menos de 1 dia';
}

function getChannelFallback(channelName: string) {
  const fallbacks: { [key: string]: any } = {
    'CaioFora': {
      id: 'manual-caio',
      title: "CaioFora - Último Vídeo AOE4",
      channel: "CaioFora",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      type: "video" as const,
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      live: false,
      timeAgo: "há 2 dias"
    },
    'Vicentin': {
      id: 'manual-vicentin', 
      title: "Vicentin - Gameplay AOE4",
      channel: "Vicentin",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      type: "video" as const,
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      live: false,
      timeAgo: "há 3 dias"
    },
    'Gks': {
      id: 'manual-gks',
      title: "Gks - Competitive AOE4",
      channel: "Gks", 
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      type: "video" as const,
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      live: false,
      timeAgo: "há 1 dia"
 
    }
  };
  
  return fallbacks[channelName] || fallbacks['CaioFora'];
}

function getManualYouTube() {
  console.log('📝 YouTube: Retornando dados manuais');
  return YOUTUBE_CHANNELS.map(channel => getChannelFallback(channel.name));
}

function getManualTwitch() {
  console.log('📝 Twitch: Retornando dados manuais');
  return [
 
  ];
}

export async function GET() {
  console.log('🚀 === API STREAMS CHAMADA ===');
  
  try {
    const [youtubeVideos, twitchStreams] = await Promise.all([
      getYouTubeVideos(),
      getTwitchStreams()
    ]);

    console.log('📈 RESUMO FINAL:', {
      youtubeVideos: youtubeVideos.length,
      twitchStreams: twitchStreams.length,
      twitchLives: twitchStreams.filter(s => s.live).length
    });

    return NextResponse.json({
      youtube: youtubeVideos,
      twitch: twitchStreams
    });
    
  } catch (error) {
    console.log('💥 ERRO GERAL:', error);
    return NextResponse.json({
      youtube: getManualYouTube(),
      twitch: getManualTwitch()
    });
  }
}