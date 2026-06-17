const axios = require('axios');

const CACHE_TTL_MS = 10 * 60 * 1000;

const FEEDS = [
  { source: 'ForexLive', url: 'https://www.forexlive.com/feed/news' },
  { source: 'FXStreet', url: 'https://www.fxstreet.com/rss/news' },
];

let cache = { items: [], fetchedAt: 0 };

function decodeEntities(text = '') {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripHtml(text = '') {
  return decodeEntities(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractTag(block, tag) {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i').exec(block);
  if (cdata) return decodeEntities(cdata[1]);

  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
  return plain ? decodeEntities(plain[1]) : '';
}

function parseRss(xml, source) {
  if (!xml || typeof xml !== 'string') return [];

  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[0];
    const title = stripHtml(extractTag(block, 'title'));
    const link = extractTag(block, 'link') || extractTag(block, 'guid');
    const description = stripHtml(extractTag(block, 'description') || extractTag(block, 'content:encoded'));
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date');

    if (!title || !link) continue;

    const publishedAt = pubDate ? new Date(pubDate) : new Date();
    if (Number.isNaN(publishedAt.getTime())) continue;

    items.push({
      id: `${source}-${Buffer.from(link).toString('base64url').slice(0, 24)}`,
      title,
      summary: description.slice(0, 220),
      url: link,
      source,
      publishedAt: publishedAt.toISOString(),
    });
  }

  return items;
}

async function fetchFeed(feed) {
  const res = await axios.get(feed.url, {
    timeout: 12000,
    headers: {
      'User-Agent': 'FXNavigators/1.0 (+https://thefxnavigators.com)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    responseType: 'text',
    validateStatus: (status) => status >= 200 && status < 400,
  });

  return parseRss(res.data, feed.source);
}

function dedupeArticles(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getNews(limit = 20) {
  const now = Date.now();
  if (cache.items.length > 0 && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items.slice(0, limit);
  }

  const results = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed)));
  const merged = results
    .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const articles = dedupeArticles(merged);

  if (articles.length > 0) {
    cache = { items: articles, fetchedAt: now };
    return articles.slice(0, limit);
  }

  return cache.items.slice(0, limit);
}

module.exports = {
  getNews,
};
