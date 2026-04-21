const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@splinetool/react-spline', '@splinetool/runtime', 'three-globe'],
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },

  images: {
    domains: [
      'res.cloudinary.com',
      'localhost',
      'your-domain.com',
      'randomuser.me',
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
        source: '/uploads/:path*',
        destination: `${process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || ''}/uploads/:path*`,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // @splinetool/react-spline only declares an ESM "import" export; Next/webpack may
    // resolve via CJS paths and fail with "Package path . is not exported". Alias the
    // package entry to the built module directly.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@splinetool/react-spline': path.resolve(
        __dirname,
        'node_modules/@splinetool/react-spline/dist/react-spline.js'
      ),
      // react-spline.js imports '@splinetool/runtime'; alias so resolution works when
      // react-spline is mapped to dist/ (otherwise webpack can't resolve the peer).
      '@splinetool/runtime': path.resolve(
        __dirname,
        'node_modules/@splinetool/runtime/build/runtime.js'
      ),
    };

    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Workaround for a Next/webpack runtime mismatch observed in this repo:
    // server chunks are emitted under `.next/server/chunks/<id>.js`, but the generated
    // `.next/server/webpack-runtime.js` tries to `require("./<id>.js")`.
    // Duplicating those numeric chunk files into `.next/server/` unblocks `next build`
    // during "Collecting page data".
    if (isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.afterEmit.tapPromise('CopyServerChunksToRoot', async () => {
            try {
              const fs = require('fs/promises');
              const path = require('path');
              const outDir = compiler.outputPath;
              const chunksDir = path.join(outDir, 'chunks');
              let names = [];
              try {
                names = await fs.readdir(chunksDir);
              } catch {
                return;
              }
              const numericChunkRe = /^[0-9]+\.js$/;
              await Promise.all(
                names
                  .filter((n) => numericChunkRe.test(n))
                  .map(async (n) => {
                    const src = path.join(chunksDir, n);
                    const dst = path.join(outDir, n);
                    try {
                      await fs.copyFile(src, dst);
                    } catch {
                      // best-effort; if it fails we let the build surface the error
                    }
                  })
              );
            } catch {
              // ignore; build will fail naturally if this is required
            }
          });
        },
      });
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
  
  // Disable source maps in production (prevents code inspection)
  productionBrowserSourceMaps: false,
  
  // Disable React DevTools in production
  reactStrictMode: true,
  
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
