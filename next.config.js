/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is now stable in Next.js 15, no experimental flag needed
  experimental: {
    serverComponentsExternalPackages: []
  }
}

module.exports = nextConfig
