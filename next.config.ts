import type { NextConfig } from 'next';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local so we can check auth config at build time
// override: true is needed because Next.js may have partially loaded env vars already
config({ path: resolve(process.cwd(), '.env.local'), override: true });

// Check if Stack Auth is configured
const isAuthConfigured = () => {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return projectId && uuidRegex.test(projectId);
};

const authEnabled = isAuthConfigured();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Use turbopack config for Turbopack
  ...(authEnabled ? {} : {
    turbopack: {
      resolveAlias: {
        '@stackframe/stack': './lib/stack-stub.ts',
      },
    },
  }),
  // Also configure webpack for production builds
  webpack: (config) => {
    if (!authEnabled) {
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['@stackframe/stack'] = './lib/stack-stub.ts';
    }
    return config;
  },
};

export default nextConfig;
