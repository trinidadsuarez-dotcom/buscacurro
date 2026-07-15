import assert from 'node:assert/strict';
import test from 'node:test';
import { TRUSTED_JOB_FEEDS, TRUSTED_JOB_HOSTS } from './jobSources.ts';

test('trusted feeds use unique HTTPS URLs on allowed hosts', () => {
  const urls = TRUSTED_JOB_FEEDS.map(feed => new URL(feed.url));
  assert.equal(new Set(urls.map(url => url.toString())).size, urls.length);
  for (const url of urls) {
    assert.equal(url.protocol, 'https:');
    assert.equal(TRUSTED_JOB_HOSTS.has(url.hostname), true, url.hostname);
  }
});

test('feeds cover every target content family', () => {
  const combined = TRUSTED_JOB_FEEDS.map(feed => `${feed.name} ${feed.url}`).join(' ').toLowerCase();
  for (const keyword of ['marketing', 'copywriting', 'seo', 'social', 'vídeo', 'animación']) {
    assert.equal(combined.includes(keyword), true, keyword);
  }
});
