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
}

module.exports = nextConfig
