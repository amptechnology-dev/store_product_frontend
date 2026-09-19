// next.config.js
const nextConfig = {
  // ...existing config
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://maps.google.com https://www.google.com;",
          },
        ],
      },
    ];
  },
};