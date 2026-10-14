import nodemailer from 'nodemailer';

let transport;
function settings() {
  const {SMTP_HOST, SMTP_PORT='465', SMTP_USER, SMTP_PASS, SMTP_FROM} = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) throw new Error('SMTP não configurado');
  return {SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM};
}
function mailer() {
  if (!transport) {
    const s=settings();
    transport=nodemailer.createTransport({
      host:s.SMTP_HOST, port:Number(s.SMTP_PORT),
      secure:Number(s.SMTP_PORT)===465,
      auth:{user:s.SMTP_USER,pass:s.SMTP_PASS},
      connectionTimeout:10000, greetingTimeout:10000, socketTimeout:15000
    });
  }
  return transport;
}
function baseUrl() {
  const value=process.env.APP_BASE_URL;
  if(!value) throw new Error('APP_BASE_URL não configurada');
  const url=new URL(value);
  if (url.username || url.password || url.search || url.hash || !['https:','http:'].includes(url.protocol)) throw new Error('APP_BASE_URL inválida');
  if (process.env.NODE_ENV==='production' && url.protocol!=='https:') throw new Error('APP_BASE_URL requer HTTPS em produção');
  return url.origin;
}
function escapeHtml(input) {return String(input).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export async function sendPasswordLink({to,name,token,kind='reset'}) {
  const setup=kind==='activation';
  const subject= setup ? 'Equivale — Ative seu acesso' : 'Equivale — Redefinição de senha';
  const url=`${baseUrl()}/definir-senha.html?token=${encodeURIComponent(token)}`;
  const greeting=`Olá, ${name || 'cliente'}!`;
  const message= setup ? 'Seu pagamento foi confirmado. Defina sua senha para ativar o acesso ao Equivale.' : 'Recebemos uma solicitação para redefinir sua senha do Equivale.';
  const text=`${greeting}\n\n${message}\n\nAcesse o link abaixo (válido por 30 minutos e uso único):\n${url}\n\nSe você não solicitou esta operação, ignore este e-mail.`;
  const html=`<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#222;line-height:1.5"><div style="max-width:540px;margin:auto"><h2>Equivale</h2><p>${escapeHtml(greeting)}</p><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(url)}" style="background:#111827;color:#fff;padding:12px 20px;text-decoration:none;border-radius:5px">Definir senha</a></p><p>O link vale por 30 minutos e só pode ser usado uma vez.</p><p>Se você não solicitou esta operação, ignore este e-mail.</p></div></body></html>`;
  return mailer().sendMail({from:settings().SMTP_FROM,to,subject,text,html});
}
