/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Real ESLint config was added this session where none existed before
  // (see eslint.config.mjs). `next build` auto-detects it and fails the
  // build on lint errors by default — it surfaces ~490 pre-existing
  // findings, which would break every deploy starting now. CI runs lint
  // informationally (warn-only) separately; keep the build itself
  // unblocked until that backlog is deliberately triaged.
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  serverExternalPackages: ['@electric-sql/pglite'],
  webpack: (config, { isServer }) => {
    if (!isServer) return config;
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push({ '@electric-sql/pglite': 'commonjs @electric-sql/pglite' });
    }
    return config;
  },
};
export default nextConfig;
