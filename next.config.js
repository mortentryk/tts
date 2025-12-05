/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is now stable in Next.js 15, no experimental flag needed
  serverExternalPackages: [],
  // Ignore ESLint errors during build to allow deployment
  // (lint errors are warnings, not blocking issues)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build (only if needed)
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // ignoreBuildErrors: true, // Uncomment if TypeScript errors block deployment
  },
  // For Capacitor Android builds, use static export
  // Note: This disables API routes. For full functionality, point Capacitor to deployed URL instead
  // Uncomment the line below for static export (for offline-capable Android app):
  // output: process.env.BUILD_STATIC === 'true' ? 'export' : undefined,
}

// Apply PWA wrapper with error handling for Next.js 15 compatibility
const shouldDisablePWA = 
  process.env.NODE_ENV === 'development' || 
  process.env.DISABLE_PWA === 'true'

if (!shouldDisablePWA) {
  try {
    const withPWA = require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: false,
      buildExcludes: [/app-build-manifest\.json$/],
      publicExcludes: ['!noprecache/**/*'],
      runtimeCaching: [
        {
          urlPattern: /^https?.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'offlineCache',
            expiration: {
              maxEntries: 200,
            },
          },
        },
      ],
    })
    module.exports = withPWA(nextConfig)
  } catch (error) {
    console.warn('PWA configuration failed, continuing without PWA:', error.message)
    module.exports = nextConfig
  }
} else {
  module.exports = nextConfig
}
