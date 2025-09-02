/** @type {import('next').NextConfig} */
const nextConfig = {

  images: {
    domains: [
      'res.cloudinary.com',
      'localhost',
      'your-domain.com'
    ],
    formats: ['image/webp', 'image/avif'],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://217.196.51.104:9090'}/api/:path*`,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Add support for SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  // Enable static exports if needed
  // output: 'export',
  
  // Optimize for production
  swcMinify: true,
  
  // Enable compression
  compress: true,
  
  // Enable source maps in development
  productionBrowserSourceMaps: false,
  
  // Suppress error overlay in development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Disable error overlay
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
};

module.exports = nextConfig;
