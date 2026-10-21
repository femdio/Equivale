import { isIP } from 'node:net';
const attempts = new Map();

export function checkRateLimit(key, options = {}) {
  const limit = options.limit ?? 5;
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const now = Date.now();

  if (
    typeof key !== 'string' ||
    !key ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    !Number.isFinite(windowMs) ||
    windowMs <= 0
  ) {
    throw new Error('Configuração inválida de rate limiting');
  }

  // Limpa registros expirados periodicamente.
  for (const [k, entry] of attempts) {
    if (now >= entry.resetAt) {
      attempts.delete(k);
    }
  }

  const entry = attempts.get(key);

  if (!entry) {
    attempts.set(key, {
      count: 1,
      resetAt: now + windowMs
    });

    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(
        1,
        Math.ceil((entry.resetAt - now) / 1000)
      )
    };
  }

  entry.count++;

  return {
    allowed: true,
    remaining: limit - entry.count
  };
}

export function loginRateLimit(req, email) {
  // Node.js recebe a conexão diretamente do Nginx local.
  // O X-Forwarded-For só deve ser aceito quando o proxy
  // é confiável e controlado pela aplicação.

  const remote = req.socket.remoteAddress || '';

const isLocalProxy = [
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1'
].includes(remote);

const forwarded = req.headers['x-real-ip'];

let ip = remote;

if (
  isLocalProxy &&
  typeof forwarded === 'string' &&
  isIP(forwarded.trim()) !== 0
) {
  ip = forwarded.trim();
}

if (isIP(ip) === 0) {
  ip = 'unknown';
}

  const ipLimit = checkRateLimit(`login-ip:${ip}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000
  });

  const accountLimit = checkRateLimit(
    `login-account:${email}`,
    {
      limit: 5,
      windowMs: 15 * 60 * 1000
    }
  );

  if (!ipLimit.allowed || !accountLimit.allowed) {
    return {
      allowed: false,
      retryAfter: Math.max(
        ipLimit.retryAfter || 0,
        accountLimit.retryAfter || 0
      )
    };
  }

  return { allowed: true };
}
