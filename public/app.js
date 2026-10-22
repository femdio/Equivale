import { renderAccountPage, handleAccountAction } from './auth-ui.js';
import {JOBS as EXAMPLES} from './catalog.js';
let JOBS=EXAMPLES;
let MEI_ACTIVITIES=[];let CNAE_REFERENCE=[];
const normOccupation=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\(a\)|\(as\)|\(o\)|\(os\)/g,'').replace(/\bindependente\b/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const meiMatch=()=>MEI_ACTIVITIES.find(a=>a.occupation+'|'+a.cnae===state.meiActivity);
const meiSuggestions=()=>{const j=job();if(!j)return [];const names=[j.name,...(j.aliases||[])].map(normOccupation).filter(Boolean);return MEI_ACTIVITIES.filter(a=>{const n=normOccupation(a.occupation);return names.some(x=>x===n)}).slice(0,15)};
async function loadMei(){try{const r=await fetch('/mei-occupations.json');if(r.ok)MEI_ACTIVITIES=await r.json()}catch{}}
loadMei();
fetch("/cnae-reference.json").then(r=>r.json()).then(d=>CNAE_REFERENCE=d).catch(()=>{});
const $=s=>document.querySelector(s), app=$('#app');const fmt=x=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(x)||0);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const parse=x=>Number(String(x).replace(/\./g,'').replace(',','.'))||0;
let page=(new URLSearchParams(location.search).has('token')?'reset':'home'),step=0,scenario=0,computed=null,proposalTouched=false,proposalDraft='';
const state={firstName:'',lastName:'',email:'',salary:0,extra:0,extraTax:false,extraFgts:false,extraThirteenth:false,extraHoliday:false,food:0,transport:0,health:0,otherBenefits:0,otherDiscounts:0,dependents:0,job:'',meiActivity:'',cnaeActivity:'',accountant:452,expenses:0,meiDAS:87,sameCompany:'unknown'};
const questions=[['salary','Qual é seu salário bruto na carteira?','money'],['food','Quanto recebe de vale-alimentação?','money'],['transport','Quanto recebe de transporte ou combustível?','money'],['health','Quanto a empresa paga pelo seu plano de saúde?','money'],['extra','Recebe algum bônus, gratificação ou pagamento por fora?','money'],['extraFlags','Esse valor extra conta para FGTS, férias ou 13º?','flags'],['otherBenefits','Quanto recebe em outros benefícios?','money'],['otherDiscounts','Quanto tem de outros descontos mensais?','money'],['dependents','Quantos dependentes declara para IR?','integer'],['job','Qual trabalho você realmente exerce?','job'],['sameCompany','Prestaria serviços para a mesma empresa?','choice']];
function job(){return JOBS.find(j=>j.id===state.job)}
async function loadOccupations(){try{const r=await fetch('/api/occupations');const data=await r.json();if(data.official){JOBS=data.jobs.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));}}catch{}}
loadOccupations();


let equivaleUsuarioAtual=null;


let usuarioCabecalho = null;

async function atualizarCabecalhoUsuario(){
  try {
    const r = await fetch('/api/auth/me', {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (!r.ok) {
      usuarioCabecalho = null;
      return;
    }

    const data = await r.json();
    usuarioCabecalho = data.user || null;

    atualizarNomeCabecalho();
  } catch (error) {
    console.warn('Falha ao consultar usuário.');
  }
}

function atualizarNomeCabecalho(){
  const button = document.querySelector('[data-go="dashboard"]');
  if (!button) return;

  button.querySelector('.equivale-user-name')?.remove();

  if (!usuarioCabecalho?.name) return;

  const span = document.createElement('span');
  span.className = 'equivale-user-name';
  span.textContent = usuarioCabecalho.name;
  span.title = usuarioCabecalho.name;

  button.appendChild(span);
}

function layout(content){app.innerHTML=`<header class="top"><div class="brand">equivale<span>.</span></div><div class="nav"><button class="button ghost" data-go="home">Início</button><button class="button ${page==='login'?'secondary':'ghost'}" data-go="login">Entrar</button><button class="button ${page==='dashboard'?'secondary':'ghost'}" data-go="dashboard">Minha conta</button></div></header>${content}<footer class="footer">Equivale • Simulações informativas sujeitas à conferência contábil • Pagamento pelo Mercado Pago</footer>`;document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));atualizarNomeCabecalho();atualizarCabecalhoUsuario()}

window.equivaleOpenSimulation = function(record) {
  const input = record?.input_data;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    alert('Esta simulação não possui dados recuperáveis.');
    return;
  }

  for (const key of Object.keys(state)) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      state[key] = input[key];
    }
  }

  scenario = Number(input.offer) || 0;
  step = 0;
  computed = null;
  proposalTouched = false;
  go('review');
};

function go(name){page=name;render();window.scrollTo(0,0)}
function shell(){layout(`<div class="shell layout"><aside class="side"><button data-tab="chat">💬 Comece aqui</button><button data-tab="review">✏️ Meus dados</button><button data-tab="results">📈 Simulação</button><button data-tab="proposal">📄 Proposta</button></aside><main class="main" id="work"></main></div>`);document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===page);b.onclick=()=>go(b.dataset.tab)})}
function render(){if(page==='home'){layout(`<main class="shell"><section class="hero"><div><span class="pill">SEU TRABALHO TEM VALOR</span><h1>Descubra quanto pedir para trabalhar como PJ.</h1><p class="lede">Conte quanto recebe na CLT e deixe o Equivale calcular os cenários.</p><button class="button" id="start">Pronto para começar? →</button><p class="muted">Relatório completo: R$ 29,90 • pagamento seguro pelo Mercado Pago</p></div><div class="video"><span class="play">▶</span><h3>Seu vídeo de apresentação</h3><small>Espaço reservado para o vídeo de vocês</small></div></section></main>`);$('#start').onclick=()=>go('checkout');return}
if(['checkout','login','forgot','reset','dashboard'].includes(page)){layout(renderAccountPage(page));handleAccountAction(page,{go,esc});return;}
shell();if(page==='chat')chat();else if(page==='review')review();else if(page==='results')results();else if(page==='proposal')proposal()}
function field(k,label){const val=Number(state[k]||0);const display=val===0?'':(k==='dependents'?String(Math.floor(val)):val.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}));return `<div class="field"><label>${label}</label><input data-field="${k}" inputmode="${k==='dependents'?'numeric':'decimal'}" type="${k==='dependents'?'number':'text'}" ${k==='dependents'?'min="0" step="1"':''} placeholder="${k==='dependents'?'0':'0,00'}" value="${display}"></div>`}
// Os zeros são apenas placeholders. Ao focar um valor existente, selecione-o para substituição rápida.
document.addEventListener('focusin',event=>{const el=event.target;if(el.matches?.('input[data-field]')&&el.type!=='number')el.select();});
function save(){document.querySelectorAll('[data-field]').forEach(e=>{state[e.dataset.field]=e.dataset.field==='dependents'?Math.max(0,Math.floor(Number(e.value)||0)):Math.max(0,parse(e.value))});document.querySelectorAll('[data-check]').forEach(e=>state[e.dataset.check]=e.checked)}
function professionPicker(){return `<div class="field"><label>Buscar profissão ou ocupação</label><input id="jobSearch" type="search" autocomplete="off" placeholder="Digite sua profissão..." value="${esc(job()?.name||'')}"></div><div class="job-results" id="jobResults"></div><p class="fine">Selecione a ocupação que corresponde ao serviço realmente prestado. Busca baseada na CBO oficial e em seus sinônimos. CBO não determina sozinha MEI nem anexo. Uma profissão pesquisável não significa enquadramento confirmado.</p>`}
function bindJobs(){const input=$('#jobSearch'),list=$('#jobResults');const paint=()=>{const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');const q=norm(input.value.trim()),items=JOBS.filter(j=>norm(j.name).includes(q)||(j.aliases||[]).some(a=>norm(a).includes(q))).slice(0,q?15:10);list.innerHTML=items.map(j=>`<button type="button" class="${j.id===state.job?'selected':''}" data-job="${j.id}">${esc(j.name)}${q&&!norm(j.name).includes(q)?` <small>(${esc((j.aliases||[]).find(a=>norm(a).includes(q))||'')})</small>`:''}</button>`).join('')+(!items.length?'<p>Nenhuma correspondência. Esta profissão ainda não foi cadastrada.</p>':'');list.querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>{state.job=b.dataset.job;state.meiActivity='';input.value=job().name;paint()})};input.addEventListener('input',()=>{state.job='';paint()});if(!state.job)input.value='';paint()}
function chat(){const q=questions[step];let body=`<span class="pill">COMECE AQUI</span><h2>Vamos fazer as contas?</h2><div class="progress"><div style="width:${(step+1)/questions.length*100}%"></div></div><div class="chat"><div class="bubble">${q[1]}</div><div id="answer">`;
if(q[2]==='money'||q[2]==='integer')body+=field(q[0],q[2]==='integer'?'Número inteiro':'Valor mensal em reais');
if(q[2]==='flags')body+=`<p class="fine">Marque como funciona na prática, independentemente da regularidade.</p>${[['extraTax','Desconta INSS e IR'],['extraFgts','Conta para FGTS'],['extraThirteenth','Conta para 13º'],['extraHoliday','Conta para férias']].map(([k,l])=>`<label class="check"><input type="checkbox" data-check="${k}" ${state[k]?'checked':''}> ${l}</label>`).join('')}`;
if(q[2]==='job')body+=professionPicker();
if(q[2]==='choice')body+=`<div class="choices">${[['yes','Sim'],['no','Não'],['unknown','Ainda não sei']].map(([v,l])=>`<button data-choice="${v}" class="${state.sameCompany===v?'selected':''}">${l}</button>`).join('')}</div>`;
body+=`</div></div><div class="actions"><button class="button secondary" id="back" ${step===0?'disabled':''}>← Voltar</button><button class="button" id="next">${step===questions.length-1?'Revisar dados':'Continuar →'}</button></div>`;$('#work').innerHTML=body;
if(q[2]==='job')bindJobs();document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{state.sameCompany=b.dataset.choice;chat()});$('#back').onclick=()=>{save();step--;chat()};$('#next').onclick=()=>{save();if(q[2]==='job'&&!state.job){alert('Selecione uma profissão da lista para continuar.');return}if(step===questions.length-1)go('review');else{step++;if(step===5&&state.extra===0)step=6;chat()}}}
function resolvedMei(){
 const current=meiMatch(); if(current)return current;
 const candidates=meiSuggestions();
 // Não inferir atividade diferente por palavras semelhantes. Apenas igualdade oficial inequívoca.
 if(candidates.length===1)return candidates[0];
 return null;
}
function regime(){return resolvedMei()?'mei':'pj'}
function selectedCnae(){return CNAE_REFERENCE.find(a=>a.cnae===state.cnaeActivity)}
async function review(){let mei=regime()==='mei';if(mei){try{mei=(await findMin('mei')).possible}catch{mei=false}}const common=[['salary','Salário CLT'],['extra','Pagamentos extras'],['food','Alimentação'],['transport','Transporte'],['health','Plano de saúde'],['otherBenefits','Outros benefícios'],['otherDiscounts','Outros descontos'],['dependents','Dependentes']];const pj=[['accountant','Gastos burocráticos (estimativa: serviços contábeis e certificado digital)*'],['expenses','Outras despesas PJ']];$('#work').innerHTML=`<span class="pill">SEUS DADOS</span><h2>Revise seus valores</h2><div class="panel"><h3>CLT</h3><div class="grid">${common.map(x=>field(...x)).join('')}</div><h3>Pagamento extra</h3>${[['extraTax','Incide INSS/IR'],['extraFgts','Incide FGTS'],['extraThirteenth','Conta para 13º'],['extraHoliday','Conta para férias']].map(([k,l])=>`<label class="check"><input data-check="${k}" type="checkbox" ${state[k]?'checked':''}> ${l}</label>`).join('')}<div class="divider"></div><h3>Atividade: ${esc(job()?.name||'não identificada')}</h3><p class="fine">${mei?'Correspondência única com ocupação MEI encontrada. Confirme que a atividade exercida corresponde à descrição legal.':'Enquadramento não confirmado automaticamente. A simulação do Simples é preliminar e requer confirmação da atividade efetivamente exercida.'}</p><button class="button secondary" id="jobEdit">Alterar profissão</button><div class="divider"></div><h3>${mei?'Custos MEI':'Custos e premissas PJ'}</h3><div class="grid">${mei?field('meiDAS','Custo mensal estimado MEI (DAS)'):pj.map(x=>field(...x)).join('')}</div><p class="fine">${mei?'* R$ 87,00 é uma estimativa mensal do DAS MEI, editável. Depende do ano, atividade e componentes de ISS/ICMS. Este modelo simplificado não acrescenta pró-labore nem INSS sobre pró-labore; a contribuição previdenciária básica está no DAS.':'* R$ 452,00 é uma estimativa de serviços contábeis e certificado digital, editável. Pró-labore estimado automaticamente como 28% do faturamento; INSS estimado em 11% sobre pró-labore, respeitando o teto. A regra dos 28% é premissa do simulador, não obrigação geral.'}</p><p class="fine">O modelo MEI simplificado não inclui contador, despesas PJ ou pró-labore. Isso não significa que todo MEI esteja dispensado de todos esses custos na prática.</p><div class="actions"><button class="button" id="recalc">Salvar e calcular →</button></div></div>`;$('#jobEdit').onclick=()=>{save();step=questions.findIndex(q=>q[0]==='job');go('chat')};$('#recalc').onclick=()=>{save();go('results')}}

async function calc(offer, annex = 'III') {
  const r = await fetch('/api/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      ...state,
      offer,
      annex,
      meiEligibility: resolvedMei() ? 'yes' : 'no',
      rbt12: offer * 12,
      payroll12: offer * 0.28 * 12
    })
  });

  if (r.status === 401) {
    throw new Error(
      'Sua sessão expirou. Entre novamente na sua conta.'
    );
  }

  if (r.status === 403) {
    throw new Error(
      'É necessário ter acesso ativo para realizar simulações.'
    );
  }

  if (!r.ok) {
    throw new Error(
      'Não foi possível realizar o cálculo. Tente novamente.'
    );
  }

  return r.json();
}

async function findMin(type){let lo=0,hi=type==='mei'?6750:50000;let target=(await calc(0)).clt.monthlySpreadsheetNet;for(let i=0;i<21;i++){let mid=(hi+lo)/2,r=await calc(mid,type==='mei'?'III':type);const net=type==='mei'?r.mei.net:r.pj.netPJ;if(net!==null&&net>=target)hi=mid;else lo=mid}let test=await calc(hi,type==='mei'?'III':type);return {value:hi,possible:type==='mei'?test.mei.status==='possivel'&&test.mei.net>=target-.1:test.pj.netPJ!==null&&test.pj.netPJ>=target-.1}}
async function results(){const el=$('#work');el.innerHTML=`<span class="pill">SIMULAÇÃO</span><h2>Seu equivalente PJ</h2><div class="panel" id="resultBox">Calculando...</div>`;try{const j=job(),r=await calc(0),type=regime(),suggested=selectedCnae()?.annex||(['III','V'].includes(j?.annex)?j.annex:'III');let scenarios=type==='mei'?await Promise.all([findMin('mei'),findMin(suggested)]):await Promise.all([findMin(suggested),findMin(suggested==='III'?'V':'III')]);let selected=type==='mei'&&scenarios[0].possible?'MEI':'Simples (cenário preliminar)';let baseMin=type==='mei'&&scenarios[0].possible?scenarios[0].value:type==='mei'?scenarios[1].value:scenarios[0].value;scenario=baseMin;computed={clt:r.clt,selected,minimum:baseMin,warning:!j||j.annex==='factor'||j.annex==='IV'||j.annex==='unknown'};
let info=type==='mei'?(scenarios[0].possible?`Ocupação MEI selecionada do Anexo XI e faturamento projetado até ${fmt(81000)} ao ano.`:`Esta ocupação consta na lista MEI, mas o mínimo necessário ultrapassa o limite de ${fmt(81000)} anuais. Exibimos uma hipótese de Simples que exige confirmação.`):`Não foi selecionada uma atividade permitida ao MEI no Anexo XI. ${j?.annex==='factor'?'O anexo depende do fator R e do CNAE.':j?.annex==='IV'?'Atividades do Anexo IV exigem cálculo adicional de contribuição patronal, ainda não implementado.':'Profissão encontrada, mas o CNAE e o anexo ainda não foram validados. A simulação usa o Anexo III somente como cenário ilustrativo, não como enquadramento confirmado.'}`;
const employerSameMonthly=r.clt.annualEmployerReference/12;
 const employerSame=await calc(employerSameMonthly,suggested);
 const employeeSame=await calc(baseMin,suggested);
 const isMeiMin=selected==='MEI';
 const sameEmployerNet=type==='mei'&&employerSame.mei.status==='possivel'?employerSame.mei.net*12:(employerSame.pj.netPJ===null?null:employerSame.pj.netPJ*12);
 const minNet=isMeiMin?employeeSame.mei.net*12:employeeSame.pj.netPJ*12;
 computed.employerSame=employerSameMonthly;
 $('#resultBox').innerHTML=`<p class="fine">Comparação de um ano inteiro • contrato PJ com 12 pagamentos mensais, sem 13º separado</p><div class="metrics"><div class="metric"><small>Referência econômica CLT anual (método da planilha)</small><strong>${fmt(r.clt.annualSpreadsheetNet)}</strong></div><div class="metric"><small>Referência anual de desembolso da empresa*</small><strong>${fmt(r.clt.annualEmployerReference)}</strong></div></div><div class="divider"></div><h3>Regime simulado: ${selected} <button class="helpBtn" id="help">?</button></h3><div class="banner">${info}</div><div class="grid"><div class="metric"><small>Cenário 1 • mesmo desembolso mensal da empresa*</small><strong>${fmt(employerSameMonthly)}</strong><p class="fine">Resultado PJ estimado no ano: ${sameEmployerNet===null?'não calculado':fmt(sameEmployerNet)}. Diferença frente à CLT: ${sameEmployerNet===null?'—':fmt(sameEmployerNet-r.clt.annualSpreadsheetNet)}.</p></div><div class="metric"><small>Cenário 2 • equivalência anual para o trabalhador</small><strong>${fmt(baseMin)}</strong><p class="fine">Resultado PJ anual estimado: ${fmt(minNet)}. Dividido em 12 parcelas mensais.</p></div></div><p class="fine">* O desembolso da empresa é uma referência baseada nas rubricas da planilha, não o custo trabalhista integral comprovado. O modelo CLT deste protótipo replica as premissas do Excel e ainda precisa de conferência de incidências e tributação (inclusive 13º e férias). O pró-labore é informativo, não despesa subtraída duas vezes.</p><p class="fine">Para Simples: pró-labore estimado em 28% do faturamento, INSS de 11% sobre pró-labore até o teto, além do DAS e dos gastos burocráticos de ${fmt(state.accountant)} mensais. Enquadramento tributário ainda preliminar.</p><div class="field"><label>Simular faturamento PJ mensal</label><input id="scenario" value="${baseMin.toFixed(2).replace('.',',')}" inputmode="decimal"></div><div class="actions"><button class="button secondary" id="simulate">Recalcular</button><button class="button" id="proposal">Preparar proposta →</button></div><div id="scenarioOutput" class="banner"></div>`;
$('#help').onclick=()=>toggleTaxHelp();$('#simulate').onclick=async()=>{scenario=Math.max(0,parse($('#scenario').value));let z=await calc(scenario,suggested);let meiNow=type==='mei'&&z.mei.status==='possivel';let cash=meiNow?z.mei.net:z.pj.netPJ;$('#scenarioOutput').textContent=`Faturamento ${fmt(scenario)} / mês; cenário ${meiNow?'MEI':'Simples'}: saldo estimado ${cash===null?'não calculável':fmt(cash)} / mês. ${type==='mei'&&!meiNow?'O MEI não comporta esta simulação.':''}`;computed.selected=meiNow?'MEI':'Simples';};$('#proposal').onclick=async()=>{
      scenario=Math.max(0,parse($('#scenario').value));
      if(scenario<=0){alert('Informe um valor PJ válido.');return;}
      const annex=selectedCnae()?.annex ||
        (['I','II','III','IV','V'].includes(job()?.annex)?job().annex:'III');
      const payload={
        ...state,offer:scenario,annex,
        meiEligibility:resolvedMei()?'yes':'no',
        rbt12:scenario*12,
        payroll12:scenario*0.28*12
      };
      const key=JSON.stringify(payload);
      if(window.equivaleUltimaProposta!==key){
        try{
          const response=await fetch('/api/simulations/save',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            credentials:'same-origin',
            body:JSON.stringify(payload)
          });
          if(!response.ok)throw Error('Não foi possível salvar a simulação.');
          window.equivaleUltimaProposta=key;
        }catch(error){
          alert(error.message);
          return;
        }
      }
      go('proposal');
    };}catch(e){$('#resultBox').textContent='Não foi possível calcular: '+e.message}}
function toggleTaxHelp(){const previous=$('#taxPopover');if(previous){previous.remove();return;}const btn=$('#help');if(!btn)return;const panel=document.createElement('div');panel.id='taxPopover';panel.className='tax-popover';panel.innerHTML=`<button type="button" id="closeTax" aria-label="Fechar informação">×</button><strong>O que significa o regime?</strong><p><b>MEI:</b> depende da ocupação permitida e do limite de faturamento.</p><p><b>Simples Nacional:</b> usa anexos diferentes conforme a atividade empresarial. Comércio: I; indústria: II; serviços: III, IV ou V.</p><p><b>Fator R:</b> certas atividades podem mudar de anexo conforme relação entre folha e receita.</p><p>A profissão CBO não define sozinha o CNAE nem garante a tributação. Quando não houver correspondência validada, o valor é ilustrativo.</p>`;btn.closest('h3').insertAdjacentElement('afterend',panel);$('#closeTax').onclick=()=>panel.remove();}
function printCleanProposal(){
 const table=document.querySelector('#compare table');
 const draftInput=document.querySelector('#draft');
 if(!table || !draftInput){alert('Aguarde a proposta terminar de carregar.');return;}
 const printed=document.querySelector('#draftPrint');
 if(printed)printed.textContent=draftInput.value;
 // Mesma abordagem da v0.2: imprimir a página real com CSS @media print.
 // Não abrir iframe, pop-up ou exigir Python.
 window.print();
}

function draft(){return `À empresa contratante,\n\nEu, ${state.firstName} ${state.lastName}, apresento uma proposta de prestação de serviços de ${job()?.name||'atividade profissional'}.\n\nValor de faturamento mensal proposto: ${fmt(scenario)}.\n\nO valor foi estimado com base em minha remuneração CLT e benefícios atuais, com premissas de tributação ainda sujeitas a confirmação.\n\nPeço que sejam negociados escopo, autonomia, entregas, reembolsos, reajustes, prazos e encerramento.\n\nPontos de atenção: exclusividade, subordinação, habitualidade e pessoalidade podem indicar risco de vínculo empregatício. A atividade declarada ao fisco precisa corresponder à atividade real.\n\nAtenciosamente,\n${state.firstName} ${state.lastName}`}
const row=(label,cltM,cltA,pjM,pjA,cls='')=>`<tr class="${cls}"><td>${esc(label)}</td><td>${cltM===null?'':fmt(cltM)}</td><td>${cltA===null?'':fmt(cltA)}</td><td>${pjM===null?'':fmt(pjM)}</td><td>${pjA===null?'':fmt(pjA)}</td></tr>`;
async function proposal(){const el=$('#work');el.innerHTML=`<span class="pill">PROPOSTA</span><h2>Prepare sua negociação</h2><p class="muted">Edite o texto e revise os cálculos detalhados abaixo.</p><div class="panel proposal-panel"><label for="draft">Texto da proposta</label><textarea id="draft" rows="13"></textarea><div id="draftPrint" class="print-draft" aria-hidden="true"></div><h3>Comparativo CLT x PJ</h3><div class="table-scroll" id="compare">Calculando...</div><p class="fine">Valores estimados, não validados para decisões contratuais. Itens anuais aparecem mensalizados apenas para comparação. FGTS não é remuneração disponível; bônus informais podem envolver diferenças legais.</p><div class="actions"><button class="button secondary" id="edit">Editar meus dados</button><button class="button" id="print">Imprimir / PDF</button><button class="button secondary" id="downloadPdf">Salvar proposta em PDF</button></div></div>`;$('#draft').value=proposalTouched?proposalDraft:draft();const syncPrintDraft=()=>{$('#draftPrint').textContent=$('#draft').value};syncPrintDraft();$('#draft').oninput=()=>{proposalTouched=true;proposalDraft=$('#draft').value;syncPrintDraft()};$('#edit').onclick=()=>{proposalDraft=$('#draft').value;go('review')};$('#print').onclick=()=>{syncPrintDraft();printCleanProposal()};$('#downloadPdf').onclick=async()=>{
  const button=$('#downloadPdf');
  button.disabled=true;
  try{
    const annex=selectedCnae()?.annex ||
      (['I','II','III','IV','V'].includes(job()?.annex)
        ?job().annex:'III');
    const r=await fetch('/api/report',{
      method:'POST',
      credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        ...state,
        offer:scenario,
        annex,
        meiEligibility:resolvedMei()?'yes':'no',
        rbt12:scenario*12
      })
    });
    if(!r.ok)throw Error('Nao foi possivel gerar o PDF.');
    const blob=await r.blob();
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='equivale-relatorio.pdf';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }catch(e){alert(e.message);}
  finally{button.disabled=false;}
};try{
 const annex=(['I','II','III','IV','V'].includes(job()?.annex)?job().annex:'III');
 const r=await calc(scenario,annex),c=r.clt;
 const employerValue=c.annualEmployerReference/12;
 const employerR=await calc(employerValue,annex);
 const mei=regime()==='mei';
 const net=x=>mei&&x.mei.status==='possivel'?x.mei.net:x.pj.netPJ;
 const oldNet=net(employerR),newNet=net(r);
 const annualize=x=>x===null?null:x*12;
 const dual=(label,cltM,cltA,oldM,eqM,cls='')=>`<tr class="${cls}"><td>${esc(label)}</td><td>${cltM===null?'':fmt(cltM)}</td><td>${cltA===null?'':fmt(cltA)}</td><td>${oldM===null?'':fmt(oldM)}</td><td>${oldM===null?'':fmt(oldM*12)}</td><td>${eqM===null?'':fmt(eqM)}</td><td>${eqM===null?'':fmt(eqM*12)}</td></tr>`;
 const m=c.spreadsheetRows;
 const rows=[
 dual('Salário bruto CLT / faturamento PJ',c.salary,m.salaryAnnual,employerValue,scenario),
 dual('Pagamentos extras',c.extra,m.extraAnnual,0,0),
 dual('Alimentação',state.food,state.food*12,0,0),
 dual('Transporte / combustível',state.transport,state.transport*12,0,0),
 dual('Plano de saúde',state.health,state.health*12,0,0),
 dual('Outros benefícios',state.otherBenefits,state.otherBenefits*12,0,0),
 dual('13º sobre salário e extras informados',m.thirteenthGross/12,m.thirteenthGross,0,0),
 dual('1/3 de férias (salário e extras considerados)',m.holidayThird/12,m.holidayThird,0,0),
 dual('FGTS conforme método da planilha',m.spreadsheetFgtsAnnual/12,m.spreadsheetFgtsAnnual,0,0),
 dual('DAS / custo MEI',null,null,-(mei&&employerR.mei.status==='possivel'?employerR.mei.das:employerR.pj.das),-(mei&&r.mei.status==='possivel'?r.mei.das:r.pj.das)),
 dual('Pró-labore (informativo, não é desconto)',null,null,mei&&employerR.mei.status==='possivel'?null:employerR.pj.prolabore,mei&&r.mei.status==='possivel'?null:r.pj.prolabore,'informative'),
 dual('INSS',-c.inss,-m.inssAnnual,mei&&employerR.mei.status==='possivel'?0:-employerR.pj.inssPro,mei&&r.mei.status==='possivel'?0:-r.pj.inssPro),
 dual('IRRF',-c.ir,-m.irAnnual,mei&&employerR.mei.status==='possivel'?0:-employerR.pj.irPro,mei&&r.mei.status==='possivel'?0:-r.pj.irPro),
 dual('Outros descontos CLT',-state.otherDiscounts,-m.discountsAnnual,0,0),
 dual('Gastos burocráticos',null,null,mei&&employerR.mei.status==='possivel'?0:-employerR.pj.accountant,mei&&r.mei.status==='possivel'?0:-r.pj.accountant),
 dual('Outras despesas PJ',null,null,mei&&employerR.mei.status==='possivel'?0:-employerR.pj.expenses,mei&&r.mei.status==='possivel'?0:-r.pj.expenses)
 ].join('');
 const oldAnnual=annualize(oldNet),newAnnual=annualize(newNet);
 const cltMonthlyTotal=c.annualSpreadsheetNet/12;
 $('#compare').innerHTML=`<table class="comparison detailed"><thead><tr><th rowspan="2">Descrição</th><th colspan="2" class="clt-head">CLT</th><th colspan="2" class="pj-head">PJ • mesmo custo*</th><th colspan="2" class="pj-head">PJ • equivalente</th></tr><tr><th class="clt-head">Mensal</th><th class="clt-head">Anual</th><th class="pj-head">Mensal</th><th class="pj-head">Anual</th><th class="pj-head">Mensal</th><th class="pj-head">Anual</th></tr></thead><tbody>${rows}<tr class="total-row total-month"><td>TOTAL MENSAL</td><td>${fmt(cltMonthlyTotal)}</td><td></td><td>${oldNet===null?'—':fmt(oldNet)}</td><td></td><td>${newNet===null?'—':fmt(newNet)}</td><td></td></tr><tr class="total-row total-annual"><td>TOTAL ANUAL</td><td></td><td>${fmt(c.annualSpreadsheetNet)}</td><td></td><td>${oldAnnual===null?'—':fmt(oldAnnual)}</td><td></td><td>${newAnnual===null?'—':fmt(newAnnual)}</td></tr><tr class="delta-row"><td>Diferença frente à CLT</td><td></td><td></td><td></td><td>${oldAnnual===null?'—':fmt(oldAnnual-c.annualSpreadsheetNet)}</td><td></td><td>${newAnnual===null?'—':fmt(newAnnual-c.annualSpreadsheetNet)}</td></tr></tbody></table><p class="fine">* Mesmo custo: aproximação do desembolso anual a partir das rubricas do Excel. O comparativo segue provisões brutas de férias e 13º e descontos mensais anualizados, sujeitos a validação contábil. FGTS não é dinheiro líquido disponível e pode ter incidências diferentes na prática.</p>`;
 }catch(e){$('#compare').textContent=e.message}}
function help(){$('#work').innerHTML=`<span class="pill">GUIA TRIBUTÁRIO</span><h2>Regimes e anexos</h2><div class="panel"><p><b>MEI:</b> ocupação expressamente permitida no Anexo XI e faturamento de até R$ 81 mil/ano (proporcional no ano de abertura), além dos demais requisitos.</p><p><b>Simples Nacional:</b> os cinco anexos abrangem comércio (I), indústria (II) e diferentes serviços (III, IV e V). A alíquota depende da receita e, em algumas atividades, do fator R.</p><p><b>Fator R:</b> em atividades específicas, a relação folha/receita acumulada pode levar ao Anexo III quando atinge 28%, ou ao V abaixo disso.</p><p><b>Anexo IV:</b> a contribuição previdenciária patronal pode precisar ser recolhida separadamente; o motor atual não a calcula.</p><p>A CBO de uma profissão e o CNAE de uma atividade empresarial são classificações diferentes. O Anexo XI lista ocupações permitidas ao MEI, mas uma profissão genérica não garante MEI nem determina sozinha o anexo.  O enquadramento definitivo requer atividade real e confirmação contábil.</p><p><a href="https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/Anexo_XI.pdf" target="_blank" rel="noopener">Lista oficial do MEI</a></p><p><b>Por que a Resolução CGSN 140?</b> É uma norma central de regulamentação do Simples Nacional e traz, no Anexo XI, a lista de ocupações permitidas ao MEI.</p><p><a href="https://normas.receita.fazenda.gov.br/sijut2consulta/normas.receisulta/link.action?idAto=92278&visao=compilado" target="_blank" rel="noopener">Resolução CGSN 140</a></p></div>`}
// Mesma proposta, texto e tabela da impressão existente.
document.addEventListener('click', event=>{
  const button=event.target.closest('#downloadPdf');
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  printCleanProposal();
},true);

render();

// Restaura a área do usuário após atualizar a página.
async function equivaleRestoreSessionV1(){
  if(new URLSearchParams(location.search).has('token') ||
     new URLSearchParams(location.search).has('login')) return;

  try{
    const response=await fetch('/api/auth/me',{
      credentials:'same-origin',
      cache:'no-store'
    });
    if(!response.ok)return;
    const data=await response.json();
    if(data.user && data.user.accessStatus==='active'){
      go('dashboard');
    }
  }catch(error){
    console.warn('Sessão não pôde ser restaurada.');
  }
}
window.addEventListener('load',equivaleRestoreSessionV1);


if (new URLSearchParams(window.location.search).has('login')) {
  window.history.replaceState({}, '', '/');
  setTimeout(() => document.querySelector('[data-go="login"]')?.click(), 0);
}
