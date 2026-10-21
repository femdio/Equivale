
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { sigOk, validateApprovedPayment } from './payments.js';

const SECRET = 'segredo-exclusivo-para-testes';
const PAYMENT_ID = '123456789';

function makeRequest({
  id = PAYMENT_ID,
  secret = SECRET,
  timestamp = Date.now(),
  requestId = 'teste-request-001',
  validSignature = true
} = {}) {
  const ts = String(timestamp);
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`;

  const signature = createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  return {
    headers: {
      'x-request-id': requestId,
      'x-signature': `ts=${ts},v1=${validSignature ? signature : '0'.repeat(64)}`
    }
  };
}

test('aceita assinatura HMAC válida', () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  assert.equal(sigOk(makeRequest(), PAYMENT_ID), true);
});

test('rejeita assinatura falsificada', () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  assert.equal(
    sigOk(makeRequest({ validSignature: false }), PAYMENT_ID),
    false
  );
});

test('rejeita assinatura expirada', () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  const timestamp = Date.now() - 10 * 60 * 1000;

  assert.equal(
    sigOk(makeRequest({ timestamp }), PAYMENT_ID),
    false
  );
});

test('rejeita assinatura de outro pagamento', () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  assert.equal(
    sigOk(makeRequest(), '987654321'),
    false
  );
});

test('rejeita ausência de assinatura', () => {
  process.env.MP_WEBHOOK_SECRET = SECRET;

  assert.equal(
    sigOk({ headers: {} }, PAYMENT_ID),
    false
  );
});


const validOrder = {
  id: '123',
  provider_preference_id: 'PREF-123',
  provider_payment_id: null
};

const validPayment = {
  id: 987654321,
  status: 'approved',
  currency_id: 'BRL',
  transaction_amount: 29.90,
  external_reference: '123',
  preference_id: 'PREF-123'
};

test('aceita pagamento aprovado e vinculado ao pedido', () => {
  assert.equal(
    validateApprovedPayment(validPayment, validOrder),
    true
  );
});

test('rejeita pagamento não aprovado', () => {
  const payment = { ...validPayment, status: 'pending' };
  assert.equal(validateApprovedPayment(payment, validOrder), false);
});

test('rejeita valor divergente', () => {
  const payment = { ...validPayment, transaction_amount: 19.90 };
  assert.equal(validateApprovedPayment(payment, validOrder), false);
});

test('rejeita moeda diferente de BRL', () => {
  const payment = { ...validPayment, currency_id: 'USD' };
  assert.equal(validateApprovedPayment(payment, validOrder), false);
});

test('rejeita referência de outro pedido', () => {
  const payment = { ...validPayment, external_reference: '999' };
  assert.equal(validateApprovedPayment(payment, validOrder), false);
});

test('rejeita preferência divergente', () => {
  const payment = { ...validPayment, preference_id: 'PREF-999' };
  assert.equal(validateApprovedPayment(payment, validOrder), false);
});

test('rejeita outro pagamento associado ao pedido', () => {
  const order = { ...validOrder, provider_payment_id: '111111' };
  assert.equal(validateApprovedPayment(validPayment, order), false);
});

test('rejeita ausência de preferência no pedido', () => {
  const order = { ...validOrder, provider_preference_id: null };
  assert.equal(validateApprovedPayment(validPayment, order), false);
});

