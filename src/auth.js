import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import pg from 'pg';
import { sendPasswordLink } from './mail.js';

let pool;
function db() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente');
    pool = new pg.Pool({connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000});
  }
  return pool;
}
const digest = value => createHash('sha256').update(value).digest('hex');
const cookieName = 'equivale_session';
const secure = process.env.NODE_ENV === 'production';
const publicUser = u => ({id:u.id,name:u.full_name,email:u.email,accessStatus:u.access_status});
const json = (res, code, data) => {res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data));};
const cookie = token => `${cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure?'; Secure':''}`;
const clearCookie = () => `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`;
async function input(req, limit=8192) {
  const type = (req.headers['content-type'] || '').split(';')[0];
  if (type !== 'application/json') throw Object.assign(new Error('Content-Type deve ser application/json'),{status:415});
  let length=0; const chunks=[];
  for await (const chunk of req) {length+=chunk.length; if(length>limit) throw Object.assign(new Error('Entrada muito grande'),{status:413}); chunks.push(chunk);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch {throw Object.assign(new Error('JSON inválido'),{status:400});}
}
function sessionValue(req) {
  const cookies=(req.headers.cookie||'').split(';').map(s=>s.trim());
  return cookies.find(c=>c.startsWith(`${cookieName}=`))?.slice(cookieName.length+1) || null;
}
async function authenticated(req) {
  const token=sessionValue(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const {rows}=await db().query(`SELECT u.id,u.full_name,u.email,u.access_status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[digest(token)]);
  return rows[0]||null;
}
async function createSession(res,userId) {
  const token=randomBytes(32).toString('hex');
  await db().query(`INSERT INTO sessions(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '7 days')`,[userId,digest(token)]);
  res.setHeader('Set-Cookie',cookie(token));
}
export async function authRoute(req,res,path) {
  if (path === '/api/auth/register' && req.method==='POST') {
    const b=await input(req); const name=String(b.name||'').trim(); const email=String(b.email||'').trim().toLowerCase();
    if (name.length<2||name.length>200||!/^\S+@\S+\.\S+$/.test(email)||email.length>254) return json(res,400,{error:'Nome ou e-mail inválido'});
    const {rows}=await db().query(`INSERT INTO users(full_name,email) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id`,[name,email]);
    // Não confirmar se a conta já existe; evitar enumeração de usuários.
    return json(res,202,{message:'Solicitação recebida. O acesso depende da confirmação do pagamento.'});
  }
  if (path === '/api/auth/login' && req.method==='POST') {
    const b=await input(req); const email=String(b.email||'').trim().toLowerCase(); const password=String(b.password||'');
    if(email.length>254||password.length>1024) return json(res,401,{error:'Credenciais inválidas'});
    const {rows}=await db().query('SELECT * FROM users WHERE lower(email)=$1',[email]);
    const u=rows[0];
    if(!u?.password_hash || !(await argon2.verify(u.password_hash,password))) return json(res,401,{error:'Credenciais inválidas'});
    if(u.access_status!=='active') return json(res,403,{error:'Acesso ainda não liberado'});
    await createSession(res,u.id);
    return json(res,200,{user:publicUser(u)});
  }
  if(path==='/api/auth/forgot-password' && req.method==='POST') {
    const b=await input(req);
    const email=String(b.email||'').trim().toLowerCase();
    if(email.length>254) return json(res,202,{message:'Se a conta estiver habilitada, enviaremos instruções por e-mail.'});
    const {rows}=await db().query('SELECT id,full_name,email FROM users WHERE lower(email)=$1 AND access_status=\'active\' AND password_hash IS NOT NULL',[email]);
    const user=rows[0];
    if(user) {
      const token=randomBytes(32).toString('hex');
      const hash=digest(token);
      await db().query(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes')`,[user.id,hash]);
      try {await sendPasswordLink({to:user.email,name:user.full_name,token});}
      catch(err){ console.error('Falha no envio da recuperação de senha:',err.message); }
    }
    return json(res,202,{message:'Se a conta estiver habilitada, enviaremos instruções por e-mail.'});
  }
  if(path==='/api/auth/reset-password' && req.method==='POST') {
    const b=await input(req);
    const token=String(b.token||'');
    const password=String(b.password||'');
    if(!/^[a-f0-9]{64}$/.test(token) || password.length<12 || password.length>128) return json(res,400,{error:'Link inválido ou senha fora dos limites (12 a 128 caracteres).'});
    const client=await db().connect();
    try {
      await client.query('BEGIN');
      const {rows}=await client.query(`SELECT p.id,p.user_id,u.access_status FROM password_reset_tokens p JOIN users u ON u.id=p.user_id WHERE p.token_hash=$1 AND p.used_at IS NULL AND p.expires_at>now() FOR UPDATE OF p`,[digest(token)]);
      const row=rows[0];
      if(!row || row.access_status!=='active') { await client.query('ROLLBACK'); return json(res,400,{error:'Link inválido ou expirado'}); }
      const hash=await argon2.hash(password,{type:argon2.argon2id});
      await client.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2',[hash,row.user_id]);
      await client.query('UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[row.user_id]);
      await client.query('DELETE FROM sessions WHERE user_id=$1',[row.user_id]);
      await client.query('COMMIT');
      return json(res,200,{message:'Senha alterada com sucesso'});
    }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  }
  if(path==='/api/auth/me' && req.method==='GET') {
    const u=await authenticated(req);
    return u?json(res,200,{user:publicUser(u)}):json(res,401,{error:'Não autenticado'});
  }
  if(path==='/api/auth/logout' && req.method==='POST') {
    const token=sessionValue(req);
    if(token) await db().query('DELETE FROM sessions WHERE token_hash=$1',[digest(token)]);
    res.setHeader('Set-Cookie',clearCookie()); return json(res,200,{ok:true});
  }
  return json(res,404,{error:'Rota não encontrada'});
}
export async function requirePaidUser(req,res) {
  const u=await authenticated(req);
  if(!u){json(res,401,{error:'Login necessário'});return null;}
  if(u.access_status!=='active'){json(res,403,{error:'Pagamento pendente'});return null;}
  return u;
}
export async function saveSimulation(userId, inputData, resultData) {
  await db().query('INSERT INTO simulations(user_id,input_data,result_data) VALUES ($1,$2,$3)',[userId,inputData,resultData]);
}
export async function listSimulations(userId) {
  const {rows}=await db().query('SELECT id,created_at,input_data,result_data FROM simulations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[userId]);
  return rows;
}
