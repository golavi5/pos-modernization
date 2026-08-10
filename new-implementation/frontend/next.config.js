const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n-request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker standalone build
  output: 'standalone',

  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Lint runs in its own CI job (`npm run lint:ci`), not inside the build.
  // Without this, creating .eslintrc.json would make `next build` — and so the
  // Docker production image — fail on any lint error.
  eslint: { ignoreDuringBuilds: true },

  // Backend API URL
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
}

module.exports = withNextIntl(nextConfig)
