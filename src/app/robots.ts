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
      // AI crawlers: explicitly allowed. These reference our public material
      // when answering "what's the best Xero AR tool" questions. Disallowing
      // them is a defensible choice — we allow by default.
      //
      // The agents split into two jobs and the distinction matters. Training
      // crawlers (GPTBot, ClaudeBot, CCBot, Applebot-Extended,
      // meta-externalagent, Amazonbot, Bytespider, cohere-ai) decide whether a
      // model knows this product exists at all. Retrieval agents fetch a page
      // live to cite it in an answer someone is reading right now:
      // OAI-SearchBot for ChatGPT search, Perplexity-User, DuckAssistBot,
      // MistralAI-User, ChatGPT-User. OAI-SearchBot was the notable omission —
      // it is a separate agent from GPTBot, so allowing GPTBot alone opted us
      // into training and out of the citations.
      {
        userAgent: [
          // Retrieval / answer citation
          'OAI-SearchBot',
          'ChatGPT-User',
          'Perplexity-User',
          'PerplexityBot',
          'DuckAssistBot',
          'MistralAI-User',
          'YouBot',
          // Training / index
          'GPTBot',
          'ClaudeBot',
          'Claude-Web',
          'anthropic-ai',
          'Google-Extended',
          'Applebot-Extended',
          'CCBot',
          'meta-externalagent',
          'FacebookBot',
          'Amazonbot',
          'Bytespider',
          'cohere-ai',
          'Diffbot',
          'TimpiBot',
          'omgili',
        ],
        allow: '/',
        disallow: ['/dashboard', '/dashboard/*', '/api', '/api/*', '/admin', '/admin/*', '/pay', '/pay/*'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://mugavi.com'}/sitemap.xml`,
    host: process.env.NEXT_PUBLIC_APP_URL ?? 'https://mugavi.com',
  };
}
