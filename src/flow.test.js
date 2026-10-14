import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/app.js', import.meta.url),'utf8');
test('simulação usa objeto calculado no cenário de mesmo custo',()=>{
 const results=source.slice(source.indexOf('async function results()'),source.indexOf('function toggleTaxHelp()'));
 assert.match(results,/const employerSame=await calc\(/);
 assert.match(results,/employerSame\.mei\.status/);
 assert.doesNotMatch(results,/employerR\./);
});
