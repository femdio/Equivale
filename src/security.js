
const APP_ORIGIN = 'https://equivalepj.femdio.com.br';

export function validateRequestOrigin(req) {
  const method = req.method || 'GET';

  // Métodos que não modificam dados.
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // O Webhook utiliza autenticação própria por assinatura HMAC.
  if (new URL(req.url, APP_ORIGIN).pathname ===
      '/api/payments/webhook') {
    return true;
  }

  const origin = req.headers.origin;

  if (typeof origin !== 'string') {
    return false;
  }

  return origin === APP_ORIGIN;
}
