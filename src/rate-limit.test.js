
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, loginRateLimit } from './rate-limit.js';


test('permite requisições dentro do limite', () => {
  const key = 'teste-permitido-' + Date.now();

  for (let i = 0; i < 5; i++) {
    const result = checkRateLimit(key, {
      limit: 5,
      windowMs: 60000
    });

    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 4 - i);
  }
});

test('bloqueia quando o limite é excedido', () => {
  const key = 'teste-bloqueio-' + Date.now();

  for (let i = 0; i < 5; i++) {
    checkRateLimit(key, { limit: 5, windowMs: 60000 });
  }

  const result = checkRateLimit(key, {
    limit: 5,
    windowMs: 60000
  });

  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
  assert.ok(result.retryAfter > 0);
});

test('isola requisições por chave', () => {
  const key1 = 'cliente-a-' + Date.now();
  const key2 = 'cliente-b-' + Date.now();

  checkRateLimit(key1, { limit: 1 });
  const blocked = checkRateLimit(key1, { limit: 1 });
  const allowed = checkRateLimit(key2, { limit: 1 });

  assert.equal(blocked.allowed, false);
  assert.equal(allowed.allowed, true);
});

test('rejeita configurações inválidas', () => {
  assert.throws(() =>
    checkRateLimit('teste-invalido', { limit: 0 })
  );
});


test('ignora IP encaminhado quando conexão não vem do proxy', () => {
  const ipReal = '198.51.100.10';

  // Cada requisição apresenta um X-Real-IP diferente.
  // A conexão real permanece no mesmo endereço.
  for (let i = 0; i < 20; i++) {
    const req = {
      socket: { remoteAddress: ipReal },
      headers: { 'x-real-ip': `203.0.113.${i + 1}` }
    };

    const result = loginRateLimit(
      req,
      `usuario-ip-teste-${i}@example.com`
    );

    assert.equal(result.allowed, true);
  }

  const req = {
    socket: { remoteAddress: ipReal },
    headers: { 'x-real-ip': '203.0.113.250' }
  };

  const result = loginRateLimit(
    req,
    'usuario-ip-teste-final@example.com'
  );

  assert.equal(result.allowed, false);
  assert.ok(result.retryAfter > 0);
});

test('ignora X-Real-IP inválido recebido do proxy local', () => {
  for (let i = 0; i < 20; i++) {
    const req = {
      socket: { remoteAddress: '127.0.0.1' },
      headers: { 'x-real-ip': 'IP-falsificado' }
    };

    const result = loginRateLimit(
      req,
      `usuario-proxy-teste-${i}@example.com`
    );

    assert.equal(result.allowed, true);
  }

  const req = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'x-real-ip': 'IP-falsificado' }
  };

  assert.equal(
    loginRateLimit(req, 'usuario-proxy-final@example.com').allowed,
    false
  );
});

test('login e recuperação possuem limites independentes', () => {
  const req = {
    socket: { remoteAddress: '198.51.100.77' },
    headers: {}
  };

  const email = 'teste-operacoes@example.com';

  // Consome as cinco tentativas de login
  for (let i = 0; i < 5; i++) {
    assert.equal(loginRateLimit(req, email, 'login').allowed, true);
  }

  // Sexta tentativa de login deve ser bloqueada
  assert.equal(loginRateLimit(req, email, 'login').allowed, false);

  // Recuperação de senha continua disponível
  assert.equal(loginRateLimit(req, email, 'recovery').allowed, true);
});

