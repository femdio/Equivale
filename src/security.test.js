
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequestOrigin } from './security.js';

const makeRequest = (method, origin, path = '/api/auth/login') => ({
  method,
  url: path,
  headers: origin === undefined ? {} : { origin }
});

test('permite GET sem Origin', () => {
  assert.equal(validateRequestOrigin(makeRequest('GET')), true);
});

test('permite POST da origem oficial', () => {
  assert.equal(
    validateRequestOrigin(
      makeRequest('POST', 'https://equivalepj.femdio.com.br')
    ),
    true
  );
});

test('bloqueia POST de domínio externo', () => {
  assert.equal(
    validateRequestOrigin(
      makeRequest('POST', 'https://site-malicioso.com')
    ),
    false
  );
});

test('bloqueia POST sem Origin', () => {
  assert.equal(
    validateRequestOrigin(makeRequest('POST')),
    false
  );
});

test('bloqueia origem HTTP sem HTTPS', () => {
  assert.equal(
    validateRequestOrigin(
      makeRequest('POST', 'http://equivalepj.femdio.com.br')
    ),
    false
  );
});

test('permite webhook sem Origin', () => {
  assert.equal(
    validateRequestOrigin(
      makeRequest('POST', undefined, '/api/payments/webhook')
    ),
    true
  );
});
