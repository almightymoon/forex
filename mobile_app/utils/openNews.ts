import type { Router } from 'expo-router';
import type { NormalizedNews } from './normalize';

export function openNewsArticle(router: Pick<Router, 'push'>, item: NormalizedNews) {
  if (!item.url) return;
  router.push({
    pathname: '/(app)/news-article',
    params: {
      url: item.url,
      title: item.title,
      source: item.source,
    },
  });
}
