import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { calculate } from './src/calculate.js';

const base = resolve('public');
const types={'.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='POST'&&req.url==='/api/calculate'){
      let body='';for await (const chunk of req){body+=chunk;if(body.length>50000)throw new Error('Entrada muito grande')}
      const result=calculate(JSON.parse(body));res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(result));return;
    }
    if(req.method!=='GET'){res.writeHead(405);res.end();return}
    if(req.url==='/api/occupations'){const jobs=JSON.parse(await readFile(resolve(base,'cbo-index.json'),'utf8'));res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=1800'});res.end(JSON.stringify({jobs,official:jobs.length>0}));return;}
    const url=new URL(req.url,'http://localhost');const file=resolve(base,'.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(file!==base&&!file.startsWith(base+sep)){res.writeHead(403);res.end();return}
    const content=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'"});res.end(content);
  }catch(err){res.writeHead(err.code==='ENOENT'?404:400,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:err.code==='ENOENT'?'Não encontrado':err.message}))}
});
const port=Number(process.env.PORT||3000);server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`CLT x PJ em http://127.0.0.1:${port}`));
