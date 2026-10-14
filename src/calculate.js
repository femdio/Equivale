// MVP educacional 2026. Valores tributários devem ser auditados pela contadora.
const money=x=>Math.round((Number(x)||0)*100)/100;
const num=x=>{const n=Number(x);return Number.isFinite(n)&&n>=0?n:0};
const INSS=[[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]];
const IR=[[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]];
const brackets={I:[[180000.0, 0.04, 0.0], [360000.0, 0.073, 5940.0], [720000.0, 0.095, 13860.0], [1800000.0, 0.107, 22500.0], [3600000.0, 0.143, 87300.0], [4800000.0, 0.19, 378000.0]],II:[[180000.0, 0.045, 0.0], [360000.0, 0.078, 5940.0], [720000.0, 0.1, 13860.0], [1800000.0, 0.112, 22500.0], [3600000.0, 0.147, 85500.0], [4800000.0, 0.3, 720000.0]],IV:[[180000.0, 0.045, 0.0], [360000.0, 0.09, 8100.0], [720000.0, 0.102, 12420.0], [1800000.0, 0.14, 39780.0], [3600000.0, 0.22, 183780.0], [4800000.0, 0.33, 577800.0]],III:[[180000,.06,0],[360000,.112,9360],[720000,.135,17640],[1800000,.16,35640],[3600000,.21,125640],[4800000,.33,648000]],V:[[180000,.155,0],[360000,.18,4500],[720000,.195,9900],[1800000,.205,17100],[3600000,.23,62100],[4800000,.305,540000]]};
export function inssEmployee(gross){let previous=0,result=0;for(const [upper,rate] of INSS){result+=Math.max(0,Math.min(gross,upper)-previous)*rate;previous=upper;}return money(result)}
export function irrf(gross,inss,dependents=0){const base=Math.max(0,gross-Math.max(inss+num(dependents)*189.59,607.20));const row=IR.find(x=>base<=x[0]);const ordinary=Math.max(0,base*row[1]-row[2]);const reduction=gross<=5000?Math.min(ordinary,312.89):gross<=7350?Math.max(0,978.62-.133145*gross):0;return money(Math.max(0,ordinary-reduction));}
export function effectiveRate(annex,rbt){if(!(rbt>0&&rbt<=4800000))return null;const row=brackets[annex].find(x=>rbt<=x[0]);return (rbt*row[1]-row[2])/rbt;}
export function calculate(raw){
 const a=raw||{};const salary=num(a.salary),extra=num(a.extra),transport=num(a.transport),food=num(a.food),health=num(a.health),otherBenefits=num(a.otherBenefits),discounts=num(a.otherDiscounts),dependents=num(a.dependents);
 const extraTax=Boolean(a.extraTax),extraFgts=Boolean(a.extraFgts),extraThirteenth=Boolean(a.extraThirteenth),extraHoliday=Boolean(a.extraHoliday);
 const base=salary+(extraTax?extra:0),inss=inssEmployee(base),ir=irrf(base,inss,dependents),liquid=money(salary+extra-inss-ir-discounts);
 const benefits=money(transport+food+health+otherBenefits);
 const fgts=money((salary+(extraFgts?extra:0))*.08);
 const thirteenthGross=money(salary+(extraThirteenth?extra:0));const thirteenthNet=money(thirteenthGross-inssEmployee(thirteenthGross)-irrf(thirteenthGross,inssEmployee(thirteenthGross),dependents));
 const holidayThird=money((salary+(extraHoliday?extra:0))/3);
 // Terço de férias aqui é bruto; manter segregado, não chamar de líquido.
 const monthlyCashBenefits=money(liquid+benefits);
 const annualCashBenefits=money(monthlyCashBenefits*12+thirteenthNet+holidayThird);
 const annualFgts=money(fgts*12+thirteenthGross*.08+holidayThird*.08);
 const annualEconomic=money(annualCashBenefits+annualFgts);
 // Visão espelho da planilha do usuário: 12 salários e extras, 12 benefícios,
 // 13º bruto, 1/3 de férias bruto e FGTS calculado sobre salário mensal + 13º base.
 // A planilha original subtrai 12 INSS e 12 IRRF; não substitui uma apuração legal.
 const spreadsheetFgtsAnnual=money((salary*12+salary)*.08+(extraFgts?extra*12*.08:0));
 const annualEmployerReference=money((salary+extra+benefits)*12+thirteenthGross+holidayThird+spreadsheetFgtsAnnual);
 const annualSpreadsheetNet=money(annualEmployerReference-(inss+ir+discounts)*12);
 const spreadsheetRows={salaryAnnual:money(salary*12),extraAnnual:money(extra*12),benefitsAnnual:money(benefits*12),thirteenthGross,holidayThird,spreadsheetFgtsAnnual,inssAnnual:money(inss*12),irAnnual:money(ir*12),discountsAnnual:money(discounts*12)};
 const clt={salary,extra,inss,ir,liquid,benefits,monthlyCashBenefits,fgts,thirteenthNet,holidayThird,annualCashBenefits,annualFgts,annualEconomic,monthlyEconomic:money(annualEconomic/12),annualEmployerReference,annualSpreadsheetNet,monthlySpreadsheetNet:money(annualSpreadsheetNet/12),spreadsheetRows};
 const offer=num(a.offer),accountant=a.accountant===undefined?452:num(a.accountant),expenses=num(a.expenses),prolabore=money(offer*.28);
 const rbt12=num(a.rbt12)||offer*12, payroll12=prolabore*12,selection=['I','II','III','IV','V','fatorR'].includes(a.annex)?a.annex:'fatorR';
 const factorR=rbt12>0?payroll12/rbt12:0;
 const annex=selection==='fatorR'?(factorR>=.279999?'III':'V'):selection;
 const effective=effectiveRate(annex,rbt12),das=effective===null?null:money(offer*effective);
 const inssPro=money(Math.min(prolabore,8475.55)*.11),irPro=irrf(prolabore,inssPro,dependents);
 const netPJ=das===null?null:money(offer-das-accountant-expenses-inssPro-irPro);
 const afterReserve=netPJ;
 const activityEligibility=a.meiEligibility==='yes'?'permitida':a.meiEligibility==='unknown'?'nao_mapeada':'nao_identificada';const meiEligible=activityEligibility==='permitida',months=Math.min(12,Math.max(1,num(a.meiMonths)||12)),annualized=offer*months,meiCeiling=81000*months/12;
 const meiDAS=a.meiDAS===undefined?87:num(a.meiDAS);const meiNet=money(offer-meiDAS);
 const status=meiEligible&&annualized<=meiCeiling&&offer>0?'possivel':'nao_confirmado';
 const pj={offer,annex,factorR,effective,das,accountant,expenses,prolabore,inssPro,irPro,netPJ,afterReserve,rbt12,status:effective===null?'fora_limite':'estimativa'};
 const mei={status,activityEligibility,annualized,meiCeiling,das:meiDAS,net:meiNet,note:'IRPF do titular e requisitos adicionais não calculados. Apenas demonstração, não confirmação de elegibilidade.'};
 const warnings=['Estimativa inicial, não validada para uso comercial. Conferir IRRF, INSS, 13º, férias e regras tributárias com a contadora.','O terço de férias foi considerado bruto; descontos específicos ainda não foram apurados.','FGTS não é dinheiro disponível mensalmente.','Trabalho PJ com pessoalidade, habitualidade e subordinação pode caracterizar vínculo empregatício.'];
 if(extra>0&&!extraTax)warnings.push('Valor extra não incluído na base tributável conforme informado. Verificar tratamento legal da remuneração.');
 if(selection==='fatorR')warnings.push('Fator R exige folha e receita histórica corretas, CNAE e enquadramento confirmados; a atividade de TI por si só não define o anexo.');
 return {year:2026,clt,pj,mei,warnings};
}
