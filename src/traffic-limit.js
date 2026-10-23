import { isIP } from 'node:net';
import { checkRateLimit } from './rate-limit.js';

function clientIP(req){
  const remote=req.socket.remoteAddress || '';
  const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote);
  const forwarded=req.headers['x-real-ip'];

  if(local && typeof forwarded==='string' && isIP(forwarded.trim())){
    return forwarded.trim();
  }

  return isIP(remote) ? remote : 'unknown';
}

export function ipLimit(req,operation,limit,windowMs){
  return checkRateLimit(
    `traffic:${operation}:ip:${clientIP(req)}`,
    {limit,windowMs}
  );
}

export function userLimit(userId,operation,limit,windowMs){
  return checkRateLimit(
    `traffic:${operation}:user:${userId}`,
    {limit,windowMs}
  );
}
