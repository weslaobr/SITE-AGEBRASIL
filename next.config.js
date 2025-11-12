// next.config.js - VERSÃO ES MODULE COM STREAMS
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sqlite3'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // 🔥 ADICIONE A CONFIGURAÇÃO DO WEBPACK
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    };
    return config;
  },
  
  images: {
    domains: [
      'i.ytimg.com',
      'static-cdn.jtvnw.net',
      'aoe4world.com',
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
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
            value: 'ALLOWALL'
          }
        ],
      }
    ];
  },
  
  compress: true,
  poweredByHeader: false,
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

export default nextConfig;