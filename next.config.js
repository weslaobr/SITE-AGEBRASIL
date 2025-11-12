// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': new URL('./', import.meta.url).pathname,
    };
    return config;
  },

  images: {
    domains: ['i.ytimg.com', 'static-cdn.jtvnw.net', 'aoe4world.com'],
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
              "connect-src 'self' https://aoe4world.com",
              "font-src 'self'",
              "object-src 'none'",
              "media-src 'self'",
              "frame-src https://www.youtube.com https://player.twitch.tv",
              "frame-ancestors 'self' https://www.youtube.com https://player.twitch.tv"
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
        ],
      },
    ];
  },

  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
