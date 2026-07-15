import assert from 'node:assert/strict';
import test from 'node:test';
import { isPrivateIp, verifySecret } from './security.ts';

test('blocks private and loopback IP addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.4', '172.16.0.1', '192.168.1.2', '::1', 'fd00::1']) {
    assert.equal(isPrivateIp(address), true, address);
  }
});

test('allows representative public IP addresses', () => {
  assert.equal(isPrivateIp('1.1.1.1'), false);
  assert.equal(isPrivateIp('8.8.8.8'), false);
  assert.equal(isPrivateIp('2606:4700:4700::1111'), false);
});

test('compares access codes without exposing the raw value', () => {
  assert.equal(verifySecret('correct horse', 'correct horse'), true);
  assert.equal(verifySecret('wrong', 'correct horse'), false);
  assert.equal(verifySecret(undefined, 'correct horse'), false);
});
