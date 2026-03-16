/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MAILTRAP_API_TOKEN: process.env.MAILTRAP_API_TOKEN,
    MAILTRAP_SENDER_EMAIL: process.env.MAILTRAP_SENDER_EMAIL,
    MAILTRAP_SENDER_NAME: process.env.MAILTRAP_SENDER_NAME,
  },
  // App Router is now stable in Next.js 13+, no experimental flag needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdnjs.cloudflare.com',
        port: '',
        pathname: '/ajax/libs/twemoji/**',
      },
      {
        protocol: 'https',
        hostname: 'openweathermap.org',
        port: '',
        pathname: '/img/wn/**',
      },
    ],
  },
}

module.exports = nextConfig
