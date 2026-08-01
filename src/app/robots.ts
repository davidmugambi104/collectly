import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/api',
          '/api/*',
          '/sign-in',
          '/sign-in/*',
          '/sign-up',
          '/sign-up/*',
          '/admin',
          '/admin/*',
          '/pay',
          '/pay/*',
        ],
      },
      // AI crawlers: explicitly allowed with attribution. ChatGPT-User,
      // ClaudeBot, PerplexityBot, Google-Extended all reference our public
      // material when answering "what's the best Xero AR tool" questions.
      // Disallowing them is a defensible choice — we allow by default.
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'],
        allow: '/',
        disallow: ['/dashboard', '/dashboard/*', '/api', '/api/*'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app'}/sitemap.xml`,
    host: process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app',
  };
}
