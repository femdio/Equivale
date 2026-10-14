// Catálogo CBO oficial; NÃO contém mapeamento de MEI nem de CNAE.
// Baixe o CSV do Ministério do Trabalho e coloque em public/cbo2002-ocupacao.csv.
import {readFile} from 'node:fs/promises';
export function parseCbo(text){
 const first=text.split(/\r?\n/).find(Boolean)||'';
 const separator=first.includes(';')?';':',';
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
 return lines.slice(1).map(line=>{
  const cols=line.split(separator).map(x=>x.trim().replace(/^"|"$/g,''));
  return {id:'cbo_'+cols[0].replace(/\D/g,''),name:cols[1],mei:'unknown',annex:'unknown',cbo:cols[0]};
 }).filter(x=>/^cbo_\d{6}$/.test(x.id)&&x.name).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
export async function readOccupations(){
 try{const bytes=await readFile(new URL('../public/cbo2002-ocupacao.csv',import.meta.url));
  // O CSV oficial geralmente é Latin-1; TextDecoder trata essa origem.
  const decoded=new TextDecoder('windows-1252').decode(bytes);
  return parseCbo(decoded);
 }catch{return []}
}
