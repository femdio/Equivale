
const APP_ORIGIN = (new URL(process.env.APP_BASE_URL || 'https://equivalepj.femdio.com.br').origin);

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
