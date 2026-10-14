const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const response=async(path,payload)=>{
  const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||'Não foi possível concluir a solicitação.');
  return data;
};
const shell=(tag,title,subtitle,content)=>`<main class="shell account-shell"><section class="account-panel panel"><span class="pill">${tag}</span><h1 class="account-title">${title}</h1><p class="lede account-lede">${subtitle}</p>${content}</section></main>`;
const field=(id,label,type='text',extra='')=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${extra} required></div>`;
const notice=(content)=>`<div class="account-notice" role="status">${content}</div>`;
const btn=(label)=>`<button class="button account-submit" type="submit">${label}</button>`;
export function renderAccountPage(page){
 if(page==='checkout')return shell('COMECE POR AQUI','Crie sua conta','Informe seus dados para iniciar a contratação do Equivale.',`<div class="account-price">R$ 29,90 <small>pagamento único • acesso vitalício</small></div><form id="registerForm">${field('registerName','Nome completo','text','autocomplete="name" minlength="2" maxlength="200"')}${field('registerEmail','E-mail','email','autocomplete="email" maxlength="254"')}${btn('Cadastrar meu interesse →')}</form><p class="fine">O checkout do Mercado Pago ainda não está habilitado. O cadastro não gera cobrança nem libera acesso.</p>${notice('Após a integração do pagamento, o acesso será liberado somente com a confirmação da transação.')}<p class="account-switch">Já tem conta? <a href="#" data-account="login">Entrar</a></p>`);
 if(page==='login')return shell('BEM-VINDO DE VOLTA','Acesse sua conta','Entre para consultar suas simulações e relatórios.',`<form id="loginForm">${field('loginEmail','E-mail','email','autocomplete="username"')}${field('loginPassword','Senha','password','autocomplete="current-password"')}${btn('Entrar →')}</form><p class="account-switch"><a href="#" data-account="forgot">Esqueci minha senha</a></p><p class="account-switch">Ainda não tem conta? <a href="#" data-account="checkout">Cadastrar</a></p>`);
 if(page==='forgot')return shell('SEGURANÇA DA CONTA','Recuperar senha','Enviaremos instruções para o e-mail cadastrado, quando a conta estiver habilitada.',`<form id="forgotForm">${field('forgotEmail','Seu e-mail','email','autocomplete="email"')}${btn('Enviar link de recuperação')}</form><p class="account-switch"><a href="#" data-account="login">Voltar ao login</a></p>`);
 if(page==='reset')return shell('SEGURANÇA DA CONTA','Definir nova senha','Crie uma senha com pelo menos 12 caracteres.',`<form id="resetForm">${field('newPassword','Nova senha','password','autocomplete="new-password" minlength="12" maxlength="128"')}${field('confirmPassword','Confirme a nova senha','password','autocomplete="new-password" minlength="12" maxlength="128"')}${btn('Salvar nova senha')}</form><p class="account-switch"><a href="#" data-account="login">Voltar ao login</a></p>`);
 return shell('MINHA CONTA','Olá!','Gerencie seu acesso ao Equivale e consulte o histórico das simulações.',`<div id="accountSummary" class="account-summary">Carregando suas informações...</div><div class="account-actions"><button id="startSimulation" class="button" type="button" disabled>Nova simulação</button><button id="logoutButton" class="button secondary" type="button">Sair</button></div><h2 class="account-history-title">Histórico de simulações</h2><div id="simulationHistory" class="account-history">Aguarde...</div><p class="fine">Relatórios PDF estarão disponíveis aqui após a integração do gerador de PDFs.</p>`);
}
function status(msg,ok=false){let el=document.querySelector('#accountStatus');if(!el){el=document.createElement('div');el.id='accountStatus';el.setAttribute('role','status');document.querySelector('.account-panel')?.append(el);}el.className=ok?'account-alert success':'account-alert';el.textContent=msg;}
export function handleAccountAction(page,{go}){
 document.querySelectorAll('[data-account]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.dataset.account)}));
 const bind=(id,callback)=>document.querySelector('#'+id)?.addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await callback();}catch(err){status(err.message);}finally{b.disabled=false;}});
 bind('registerForm',async()=>{await response('/api/auth/register',{name:document.querySelector('#registerName').value.trim(),email:document.querySelector('#registerEmail').value.trim()});status('Cadastro recebido. O pagamento ainda não está habilitado; não foi realizada nenhuma cobrança.',true);});
 bind('loginForm',async()=>{await response('/api/auth/login',{email:document.querySelector('#loginEmail').value.trim(),password:document.querySelector('#loginPassword').value});go('dashboard');});
 bind('forgotForm',async()=>{await response('/api/auth/forgot-password',{email:document.querySelector('#forgotEmail').value.trim()});status('Se a conta estiver habilitada, as instruções serão enviadas para o e-mail informado.',true);});
 bind('resetForm',async()=>{const password=document.querySelector('#newPassword').value;if(password!==document.querySelector('#confirmPassword').value)throw Error('As senhas não coincidem.');const token=new URLSearchParams(location.search).get('token');if(!token)throw Error('Link sem token. Solicite uma nova recuperação.');await response('/api/auth/reset-password',{token,password});history.replaceState({},'',location.pathname);status('Senha alterada. Você já pode fazer login.',true);});
 if(page==='dashboard')loadDashboard(go);
}
async function loadDashboard(go){try{
 const r=await fetch('/api/auth/me',{credentials:'same-origin'});if(!r.ok){go('login');return;}const {user}=await r.json();
 const summary=document.querySelector('#accountSummary');summary.innerHTML=`<div class="account-user"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span></div><span class="account-state">${user.accessStatus==='active'?'Acesso vitalício ativo':'Acesso pendente'}</span>`;
 const start=document.querySelector('#startSimulation');start.disabled=user.accessStatus!=='active';start.onclick=()=>go('chat');
 document.querySelector('#logoutButton').onclick=async()=>{try{await response('/api/auth/logout',{});}finally{go('login');}};
 const h=document.querySelector('#simulationHistory');if(user.accessStatus!=='active'){h.textContent='Aguardando confirmação do pagamento. Nenhuma simulação disponível.';return;}
 const rs=await fetch('/api/simulations',{credentials:'same-origin'});if(!rs.ok)throw Error('Não foi possível carregar o histórico.');const data=await rs.json();
 h.innerHTML=data.simulations?.length?data.simulations.map(x=>`<div class="history-row"><strong>Simulação</strong><time>${new Date(x.created_at).toLocaleString('pt-BR')}</time></div>`).join(''):'Você ainda não possui simulações salvas.';
 }catch(e){const h=document.querySelector('#simulationHistory');if(h)h.textContent=e.message;}}
