import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Sticker photos are posted to server actions (app/quests, app/stickers).
  // The browser shrinks them to 2400px first, but leave headroom for PNGs.
  experimental: {
    serverActions: { bodySizeLimit: '16mb' },
  },
  // sharp is a native module; keep it out of the server bundle.
  serverExternalPackages: ['sharp'],
}

export default nextConfig
