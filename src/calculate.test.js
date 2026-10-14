import test from 'node:test';import assert from 'node:assert/strict';import {calculate,inssEmployee,effectiveRate} from './calculate.js';
test('INSS faixas e teto',()=>{assert.equal(inssEmployee(0),0);assert.ok(Math.abs(inssEmployee(1621)-121.575)<0.011);assert.equal(inssEmployee(20000),inssEmployee(8475.55))});
test('simples primeira faixa',()=>{assert.equal(effectiveRate('III',120000),.06);assert.equal(effectiveRate('V',120000),.155);assert.equal(effectiveRate('III',5000000),null)});
test('extra sem incidências não gera FGTS extra',()=>{const a=calculate({salary:6000,extra:1270,extraFgts:false});const b=calculate({salary:6000,extra:1270,extraFgts:true});assert.ok(Math.abs((b.clt.fgts-a.clt.fgts)-101.6)<0.001)});
test('prolabore não é deduzido duas vezes',()=>{const a=calculate({salary:6000,offer:10000,annex:'III',rbt12:120000,prolabore:2000});assert.equal(a.pj.prolabore,2800);assert.equal(a.pj.inssPro,308);assert.equal(a.pj.netPJ,10000-600-452-308-a.pj.irPro)});
test('MEI bloqueado sem confirmação da atividade',()=>{const r=calculate({offer:4000,meiEligible:false});assert.equal(r.mei.status,'nao_confirmado')});

test('ocupação digitador com projeção anual de 60 mil pode exibir cenário MEI',()=>{
 const r=calculate({activity:'digitador',meiEligibility:'yes',offer:5000,accountant:0,expenses:0});
 assert.equal(r.mei.status,'possivel');
 assert.equal(r.mei.annualized,60000);
});
test('mesma ocupação acima de R$81 mil anuais não é indicada como MEI',()=>{
 const r=calculate({activity:'digitador',meiEligibility:'yes',offer:7000});
 assert.equal(r.mei.status,'nao_confirmado');
});
test('atividade outra não é liberada automaticamente como MEI',()=>{
 const r=calculate({meiEligibility:'unknown',activity:'other',activityDescription:'outra atividade',offer:3000});
 assert.equal(r.mei.activityEligibility,'nao_mapeada');
 assert.equal(r.mei.status,'nao_confirmado');
});

test('pró-labore acompanha faturamento sem dupla dedução',()=>{const a=calculate({salary:3000,offer:12000,annex:'III'});assert.equal(a.pj.prolabore,3360);assert.equal(a.pj.inssPro,369.6);assert.equal(a.pj.accountant,452);assert.equal(a.pj.netPJ,12000-a.pj.das-452-a.pj.inssPro-a.pj.irPro)});

test('cenário anual replica desembolso bruto da planilha de referência',()=>{
 const r=calculate({salary:6347.19,extra:1270,food:880,transport:300,health:380,extraThirteenth:true,extraHoliday:true,offer:10802.60,annex:'III'});
 assert.equal(r.clt.annualEmployerReference,126883.61);
 assert.equal(r.clt.spreadsheetRows.spreadsheetFgtsAnnual,6601.08);
 assert.ok(Math.abs(r.clt.annualSpreadsheetNet-112440.69)<1);
});


test('cenário Juliano reproduz saldo anual CLT da planilha a 20 centavos e faturamento PJ próximo a 10803',()=>{
 const input={salary:6347.19,extra:1270,food:880,transport:300,health:380,extraThirteenth:true,extraHoliday:true,accountant:452,annex:'III'};
 const base=calculate({...input,offer:10802.6});
 assert.ok(Math.abs(base.clt.annualSpreadsheetNet-112440.69)<0.25);
 assert.ok(Math.abs(base.pj.netPJ*12-base.clt.annualSpreadsheetNet)<5);
});

test('MEI usa custo mensal estimado de R$ 87 sem pró-labore adicional no saldo MEI', () => {
  const r = calculate({ salary: 2500, offer: 5000, meiEligibility: 'yes' });
  assert.equal(r.mei.das, 87);
  assert.equal(r.mei.net, 4913);
  assert.equal(r.mei.status, 'possivel');
  assert.equal(calculate({offer: 7000, meiEligibility: 'yes'}).mei.status, 'nao_confirmado');
});
