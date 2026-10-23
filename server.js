import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { calculate } from './src/calculate.js';
import { generateReport } from './src/report.js';
import { authRoute, requirePaidUser, saveSimulation, listSimulations } from './src/auth.js';
import { paymentRoute } from './src/payments.js';
import { validateRequestOrigin } from './src/security.js';
import { ipLimit, userLimit } from './src/traffic-limit.js';

const base=resolve('public');
const types={'.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function bodyJson(req){
  if((req.headers['content-type']||'').split(';')[0]!=='application/json')throw Object.assign(new Error('Content-Type inválido'),{status:415});
  const chunks=[];let total=0;
  for await(const chunk of req){total+=chunk.length;if(total>50000)throw Object.assign(new Error('Entrada muito grande'),{status:413});chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('JSON inválido'),{status:400});}
}
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const path=url.pathname;
// Proteção contra requisições de origens não autorizadas
    if (!validateRequestOrigin(req)) {
      return json(res, 403, {
        error: 'Origem da requisição não autorizada'
      });
    }

    if(req.method==='POST' && path==='/api/auth/register'){
      const limit=ipLimit(req,'register',5,60*60*1000);
      if(!limit.allowed){
        res.setHeader('Retry-After',String(limit.retryAfter));
        return json(res,429,{error:'Muitas solicitações. Tente novamente mais tarde.'});
      }
    }

    if(req.method==='POST' && path==='/api/payments/checkout'){
      const limit=ipLimit(req,'checkout-request',20,15*60*1000);
      if(!limit.allowed){
        res.setHeader('Retry-After',String(limit.retryAfter));
        return json(res,429,{error:'Muitas tentativas de pagamento. Tente novamente mais tarde.'});
      }
    }

    if(path.startsWith('/api/payments/')) return await paymentRoute(req,res,path,url);
    if(path.startsWith('/api/auth/')) return await authRoute(req,res,path);
    if(path==='/api/report' && req.method==='POST'){
      const user=await requirePaidUser(req,res);
      if(!user)return;
      const input=await bodyJson(req);
      if(!input || typeof input!=='object' || Array.isArray(input) ||
         !Number.isFinite(Number(input.offer)) ||
         Number(input.offer)<=0 || Number(input.offer)>400000)
        return json(res,400,{error:'Faturamento invalido'});
      const result=calculate(input);
      const pdf=await generateReport(input,result,{
        name:user.full_name
      });
      res.writeHead(200,{
        'Content-Type':'application/pdf',
        'Content-Disposition':'attachment; filename="equivale-relatorio.pdf"',
        'Content-Length':pdf.length,
        'Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff'
      });
      res.end(pdf);
      return;
    }
    if(path==='/api/simulations/save' && req.method==='POST'){
      const user=await requirePaidUser(req,res);
      if(!user)return;
      const throttle=userLimit(user.id,'simulation-save',20,3600000);
      if(!throttle.allowed){
        res.setHeader('Retry-After',String(throttle.retryAfter));
        return json(res,429,{error:'Limite de utilização atingido. Tente novamente mais tarde.'});
      }

      const input=await bodyJson(req);
      if(!input || typeof input!=='object' || Array.isArray(input) ||
         !Number.isFinite(Number(input.offer)) ||
         Number(input.offer)<=0 || Number(input.offer)>400000)
        return json(res,400,{error:'Simulação inválida'});
      const result=calculate(input);
      await saveSimulation(user.id,input,result);
      return json(res,201,{saved:true});
    }
    if(path==='/api/calculate' && req.method==='POST'){
      const user=await requirePaidUser(req,res);if(!user)return;
      const throttle=userLimit(user.id,'calculate',60,60000);
      if(!throttle.allowed){
        res.setHeader('Retry-After',String(throttle.retryAfter));
        return json(res,429,{error:'Limite de utilização atingido. Tente novamente mais tarde.'});
      }

      const input=await bodyJson(req);
      const result=calculate(input);
      return json(res,200,result);
    }
    if(path==='/api/simulations' && req.method==='GET'){
      const user=await requirePaidUser(req,res);if(!user)return;
      return json(res,200,{simulations:await listSimulations(user.id)});
    }
    if(req.method!=='GET'){res.writeHead(405,{'Allow':'GET'});res.end();return;}
    if(path==='/api/occupations'){
      const jobs=JSON.parse(await readFile(resolve(base,'cbo-index.json'),'utf8'));
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=1800'});
      res.end(JSON.stringify({jobs,official:jobs.length>0}));return;
    }
    if(path.startsWith('/api/'))return json(res,404,{error:'Rota não encontrada'});
    let decoded;
    try {decoded=decodeURIComponent(path);}catch{return json(res,400,{error:'URL inválida'});}
    const file=resolve(base,'.'+(decoded==='/'?'/index.html':decoded));
    if(file!==base&&!file.startsWith(base+sep))return json(res,403,{error:'Acesso negado'});
    const content = await readFile(file);

const headers = {
  'Content-Type': types[extname(file)] || 'application/octet-stream',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer'
};

// Impede o armazenamento em cache da página de ativação.
if (path === '/definir-senha.html') {
  headers['Cache-Control'] = 'no-store';
}

res.writeHead(200, headers);
res.end(content);
  }catch(err){
    if(err.code==='ENOENT')return json(res,404,{error:'Não encontrado'});
    if(err.status)return json(res,err.status,{error:err.message});
    console.error('Erro na requisição:',err);
    return json(res,500,{error:'Erro interno'});
  }
});
const port=Number(process.env.PORT||3000);
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Equivale em http://127.0.0.1:${port}`));
