import assert from 'node:assert/strict';
import test from 'node:test';
import { isTargetJobTitle } from './jobMatching.ts';

test('accepts target marketing, writing and social roles', () => {
  for (const title of ['SEO Specialist', 'Copywriter', 'Redactor web', 'Social Media Manager']) {
    assert.equal(isTargetJobTitle(title), true, title);
  }
});

test('accepts audiovisual and 2D/3D animation roles', () => {
  for (const title of ['Video Editor', 'Productor audiovisual', '3D Artist', 'Animador 2D', 'VFX Artist']) {
    assert.equal(isTargetJobTitle(title), true, title);
  }
});

test('rejects unrelated roles returned by broad feeds', () => {
  for (const title of ['Senior Data Scientist', 'Backend Engineer', 'Finance Manager']) {
    assert.equal(isTargetJobTitle(title), false, title);
  }
});
