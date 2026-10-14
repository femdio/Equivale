import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { calculate } from './src/calculate.js';
import { authRoute, requirePaidUser, saveSimulation, listSimulations } from './src/auth.js';

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
    if(path.startsWith('/api/auth/')) return await authRoute(req,res,path);
    if(path==='/api/calculate' && req.method==='POST'){
      const user=await requirePaidUser(req,res);if(!user)return;
      const input=await bodyJson(req);
      const result=calculate(input);
      await saveSimulation(user.id,input,result);
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
    const content=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'"});
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
