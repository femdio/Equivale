
const form=document.getElementById('password-form');
const message=document.getElementById('message');
const recovery=document.getElementById('recovery-link');
const token=new URLSearchParams(location.search).get('token');

// Impede que o token permaneça na URL ao navegar.
history.replaceState(null,'','/definir-senha.html');

const eyeOpen='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeClosed='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a15.8 15.8 0 0 1-3 3.7M6 6.9C3.3 8.7 2 12 2 12s3.5 7 10 7c1.5 0 2.8-.4 4-1"/><path d="M10 10a3 3 0 0 0 4 4"/></svg>';

document.querySelectorAll('[data-toggle]').forEach(button=>{
  const input=document.getElementById(button.dataset.toggle);
  button.innerHTML=eyeOpen;
  button.addEventListener('click',()=>{
    const visible=input.type==='password';
    input.type=visible?'text':'password';
    button.innerHTML=visible?eyeClosed:eyeOpen;
    button.setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha');
    button.title=visible?'Ocultar senha':'Mostrar senha';
  });
});

function expired(){
  message.textContent='Este link expirou ou já foi utilizado. Se você já pagou, seu acesso continua garantido. Acesse o Equivale, clique em Entrar e depois em Esqueci minha senha para solicitar outro link.';
  form.hidden=true;
  recovery.hidden=false;
}
if(!token || !/^[a-f0-9]{64}$/.test(token)) expired();

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!token)return expired();

  const password=document.getElementById('password').value;
  const confirm=document.getElementById('confirm').value;
  const button=form.querySelector('[type="submit"]');

  if(password!==confirm){
    message.textContent='As senhas não coincidem.';
    return;
  }
  if(password.length<8 || password.length>32){
    message.textContent='A senha deve ter entre 8 e 32 caracteres.';
    return;
  }

  button.disabled=true;
  message.textContent='Salvando senha...';

  try{
    const response=await fetch('/api/auth/reset-password',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'same-origin',
      body:JSON.stringify({token,password})
    });
    const result=await response.json();
    if(!response.ok){
      if(response.status===400 && /link|expirad|utilizad/i.test(result.error||'')) {
        expired();
      } else {
        message.textContent=result.error||'Não foi possível salvar sua senha.';
      }
      return;
    }
    form.hidden=true;
    message.textContent='Senha definida com sucesso! Você será direcionado ao Equivale para entrar na sua conta.';
    setTimeout(()=>{location.replace('/');},2500);
  }catch{
    message.textContent='Falha na conexão. Tente novamente.';
  }finally{
    button.disabled=false;
  }
});
