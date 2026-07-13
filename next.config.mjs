/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
