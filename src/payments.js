import pg from 'pg';
import { randomBytes, createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { sendPasswordLink } from './mail.js';

const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000});
const API = 'https://api.mercadopago.com';
const PRICE_CENTS = 2990;
function json(res, code, data) {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
}
function fail(message, status=400) {return Object.assign(new Error(message),{status});}
async function body(req, limit=8192) {
  if ((req.headers['content-type']||'').split(';')[0]!=='application/json') throw fail('Content-Type inválido',415);
  let size=0;const chunks=[];
  for await (const b of req) {size+=b.length;if(size>limit)throw fail('Entrada muito grande',413);chunks.push(b);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail('JSON inválido');}
}
function baseUrl() {
  const raw=process.env.APP_BASE_URL;
  if(!raw)throw fail('APP_BASE_URL ainda não configurada',503);
  let url;
  try {url=new URL(raw);}catch{throw fail('APP_BASE_URL inválida',503);}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw fail('APP_BASE_URL deve ser a origem HTTPS pública do site',503);
  return url.origin;
}
function token(){const t=process.env.MP_ACCESS_TOKEN;if(!t)throw fail('Mercado Pago não configurado',503);return t;}
async function mp(path,opts={}) {
  const ac=new AbortController(); const timer=setTimeout(()=>ac.abort(),12000);
  try {
    const {allowNotFound=false,...fetchOptions}=opts;
    const res=await fetch(`${API}${path}`,{...fetchOptions,headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json',...(fetchOptions.headers||{})},signal:ac.signal});
    if(res.status===404 && opts.allowNotFound===true)return null;
    if(!res.ok)throw fail(`Falha na comunicação com Mercado Pago (${res.status})`,502);
    return await res.json();
  }finally{clearTimeout(timer);}
}
export function sigOk(req, id) {
  const secret=process.env.MP_WEBHOOK_SECRET;
  const signature=String(req.headers['x-signature']||'');
  const requestId=String(req.headers['x-request-id']||'');
  if(!secret||!requestId||!signature||!/^[0-9]+$/.test(String(id)))return false;
  const kv=Object.fromEntries(signature.split(',').map(x=>x.trim().split(/=(.*)/s).slice(0,2)));
  if(!kv.ts||!/^[a-f0-9]{64}$/i.test(kv.v1||''))return false;
  if (!/^\d{10,13}$/.test(String(kv.ts))) {
    console.warn('MP Webhook: timestamp inválido');
    return false;
  }
  const manifest=`id:${String(id).toLowerCase()};request-id:${requestId};ts:${kv.ts};`;
  const expected=createHmac('sha256',secret).update(manifest).digest('hex');
  const valid=timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(kv.v1,'hex'));
  if(!valid)console.warn('MP HMAC divergente', {
    id:String(id), requestIdPresente:!!requestId,
    timestampDigitos:String(kv.ts).length,
    assinaturaPresente:!!kv.v1
  });
  return valid;
}
async function createCheckout(req,res) {
  const b=await body(req);
  const name=String(b.name||'').trim();const email=String(b.email||'').trim().toLowerCase();
  if(name.length<2||name.length>200||email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw fail('Nome ou e-mail inválido');
  const base=baseUrl();
  const {rows:[user]}=await pool.query(`INSERT INTO users(full_name,email) VALUES($1,$2) ON CONFLICT (lower(email)) DO UPDATE SET updated_at=now() RETURNING id,access_status`,[name,email]);
  if(user.access_status==='active')throw fail('Já existe acesso ativo para este e-mail. Utilize o login.',409);
  const {rows:[order]}=await pool.query(`INSERT INTO payments(user_id,amount_cents,status) VALUES ($1,$2,'pending') RETURNING id`,[user.id,PRICE_CENTS]);
  const preference=await mp('/checkout/preferences',{method:'POST',headers:{'X-Idempotency-Key':randomUUID()},body:JSON.stringify({
    items:[{id:'equivale-vitalicio',title:'Equivale — Acesso vitalício',quantity:1,currency_id:'BRL',unit_price:29.90}],
    payer:{email},external_reference:String(order.id),
    back_urls:{success:`${base}/?pagamento=sucesso`,pending:`${base}/?pagamento=pendente`,failure:`${base}/?pagamento=erro`},
    notification_url:`${base}/api/payments/webhook`,
    auto_return:'approved'
  })});
  if(!preference.id)throw fail('Não foi possível criar checkout',502);
  await pool.query('UPDATE payments SET provider_preference_id=$1,updated_at=now() WHERE id=$2',[String(preference.id),order.id]);
  const url=process.env.MP_ENVIRONMENT==='sandbox'?preference.sandbox_init_point:preference.init_point;
  if(!url||new URL(url).protocol!=='https:')throw fail('URL de checkout não disponível para o ambiente configurado',502);
  return json(res,200,{checkoutUrl:url});
}

export function validateApprovedPayment(payment, order) {
  if (!payment || !order) return false;

  if (payment.status !== 'approved') return false;

  if (payment.currency_id !== 'BRL') return false;

  if (
    !Number.isFinite(Number(payment.transaction_amount)) ||
    Math.round(Number(payment.transaction_amount) * 100) !== 2990
  ) return false;

  if (String(payment.external_reference || '') !== String(order.id)) {
    return false;
  }

  if (!order.provider_preference_id) return false;

  if (
    payment.preference_id != null &&
    String(payment.preference_id) !==
      String(order.provider_preference_id)
  ) return false;

  if (
    order.provider_payment_id != null &&
    String(order.provider_payment_id) !== String(payment.id)
  ) return false;

  return true;
}

async function webhook(req,res,url) {
  // Para payment, o Mercado Pago envia o ID no corpo ou em data.id no query.
  const payload=await body(req,32768);
  const id=payload?.data?.id??url.searchParams.get('data.id');
  const type=payload?.type??url.searchParams.get('type');
  if(type!=='payment')return json(res,200,{ok:true});
  if(!sigOk(req,id))return json(res,401,{error:'Assinatura inválida'});
  const payment=await mp(`/v1/payments/${encodeURIComponent(String(id))}`,{allowNotFound:true});
  if(!payment)return json(res,200,{ok:true,ignored:'payment_not_found'});
// Pagamentos não aprovados não liberam acesso.
if (payment.status !== 'approved') {
  return json(res, 200, { ok: true });
}
  const orderId=String(payment.external_reference||'');
  if(!/^[0-9]{1,18}$/.test(orderId))return json(res,200,{ok:true});
  const client=await pool.connect();let activation=null;
  try {
    await client.query('BEGIN');
    const {rows:[order]}=await client.query(`SELECT p.id,p.status,p.provider_preference_id,p.provider_payment_id,u.id AS uid,u.email,u.full_name,u.password_hash
      FROM payments p JOIN users u ON u.id=p.user_id WHERE p.id=$1 FOR UPDATE OF p`,[orderId]);

    if (!validateApprovedPayment(payment, order)) {
  await client.query('ROLLBACK');
  return json(res, 200, { ok: true });
}
    if(order.status==='approved'){await client.query('COMMIT');return json(res,200,{ok:true});}
    await client.query('UPDATE payments SET provider_payment_id=$1,status=$2,updated_at=now() WHERE id=$3',[String(payment.id),'approved',orderId]);
    await client.query(`UPDATE users SET access_status='active',updated_at=now() WHERE id=$1`,[order.uid]);
    if(!order.password_hash){
      const raw=randomBytes(32).toString('hex');
      await client.query(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes')`,[order.uid,createHash('sha256').update(raw).digest('hex')]);
      activation={to:order.email,name:order.full_name,token:raw};
    }
    await client.query('COMMIT');
  } catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  if(activation){try{await sendPasswordLink({...activation,kind:'activation'});}catch(err){console.error('Falha no envio do link de ativação:',err.message);}}
  return json(res,200,{ok:true});
}
export async function paymentRoute(req,res,path,url){
  if(path==='/api/payments/checkout'&&req.method==='POST')return createCheckout(req,res);
  if(path==='/api/payments/webhook'&&req.method==='POST')return webhook(req,res,url);
  return json(res,404,{error:'Rota não encontrada'});
}
