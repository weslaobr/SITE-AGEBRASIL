// next.config.js - VERSÃO ES MODULE COM STREAMS
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sqlite3'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // 🔥 NOVAS CONFIGURAÇÕES PARA STREAMS
  images: {
    domains: [
      'i.ytimg.com',           // Thumbnails do YouTube
      'static-cdn.jtvnw.net',  // Thumbnails do Twitch
      'aoe4world.com',         // Imagens do AOE4 World
    ],
    formats: ['image/webp', 'image/avif'], // Otimização
  },
  
  // 🔥 HEADERS PARA EMBEDS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self'",
              "font-src 'self'",
              "object-src 'none'",
              "media-src 'self'",
              "frame-src https://www.youtube.com https://player.twitch.tv",
              "frame-ancestors 'self' https://www.youtube.com https://player.twitch.tv"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL' // Permite embeds do YouTube e Twitch
          }
        ],
      }
    ];
  },
  
  // 🔥 OTIMIZAÇÕES DE PERFORMANCE
  compress: true,
  poweredByHeader: false,
  
  // 🔥 COMPILER OPTIONS (Opcional - remove consoles em produção)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

export default nextConfig