import nodemailer from 'nodemailer';

let transport;
function settings() {
  const {
    SMTP_HOST,
    SMTP_PORT = '465',
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM
  } = process.env;

  if (!SMTP_HOST || !SMTP_FROM) {
    throw new Error('SMTP não configurado');
  }

  // Permitir SMTP sem autenticação somente para o Mailpit local
  const isLocalMailpit =
    SMTP_HOST === '127.0.0.1' &&
    Number(SMTP_PORT) === 1025;

  if ((!SMTP_USER || !SMTP_PASS) && !isLocalMailpit) {
    throw new Error('Autenticação SMTP obrigatória');
  }

  return { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM };
}

function mailer() {
  if (!transport) {
    const s=settings();
    transport=nodemailer.createTransport({
      host:s.SMTP_HOST, port:Number(s.SMTP_PORT),
      secure:Number(s.SMTP_PORT)===465,
      ...(s.SMTP_USER && s.SMTP_PASS
  ? { auth: { user: s.SMTP_USER, pass: s.SMTP_PASS } }
  : {}),
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
  const activation = kind === 'activation';
  const subject = activation
    ? 'Equivale — Ative seu acesso'
    : 'Equivale — Redefinição de senha';

  const url = `${baseUrl()}/definir-senha.html?token=${encodeURIComponent(token)}`;
  const period = activation ? '24 horas' : '30 minutos';
  const action = activation ? 'Criar minha senha' : 'Redefinir senha';
  const greeting = `Olá, ${name || 'cliente'}!`;

  const description = activation
    ? 'Seu pagamento foi confirmado. Seu acesso vitalício ao Equivale está liberado. Defina sua senha para começar.'
    : 'Recebemos uma solicitação para redefinir sua senha do Equivale.';

  const guidance = 'Se o link expirar, acesse o Equivale, clique em Entrar e depois em Esqueci minha senha. Não é necessário realizar outro pagamento.';

  const text = `${greeting}

${description}

${action}:
${url}

Este link é válido por ${period} e pode ser utilizado somente uma vez.

${guidance}

Se você não solicitou esta operação, ignore esta mensagem.

Equivale`;

  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f3f8f7;font-family:Arial,Helvetica,sans-serif;color:#17333e">
  <div style="padding:36px 14px">
    <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dce9e5;border-radius:18px;overflow:hidden">
      <div style="padding:24px 32px;border-bottom:1px solid #e7efec">
        <div style="font-size:30px;font-weight:800;letter-spacing:-1px;color:#106b5d">equivale<span style="color:#e3a24b">.</span></div>
      </div>
      <div style="padding:32px">
        <div style="font-size:12px;font-weight:bold;color:#106b5d;text-transform:uppercase;letter-spacing:1px">${activation ? 'Primeiro acesso' : 'Segurança da conta'}</div>
        <h1 style="font-size:25px;margin:14px 0;color:#17333e">${activation ? 'Seu acesso está pronto!' : 'Redefina sua senha'}</h1>
        <p style="line-height:1.7">${escapeHtml(greeting)}</p>
        <p style="line-height:1.7">${escapeHtml(description)}</p>
        <p style="margin:28px 0">
          <a href="${escapeHtml(url)}" style="background:#106b5d;color:#fff;padding:15px 24px;text-decoration:none;border-radius:9px;font-weight:bold;display:inline-block">${action}</a>
        </p>
        <p style="font-size:14px;line-height:1.7">Este link é válido por <strong>${period}</strong> e pode ser utilizado somente uma vez.</p>
        <p style="font-size:14px;line-height:1.7;color:#526d75">${escapeHtml(guidance)}</p>
        <p style="font-size:13px;line-height:1.6;color:#74868b">Se você não solicitou esta operação, ignore esta mensagem.</p>
      </div>
      <div style="background:#f3f8f7;padding:18px 32px;font-size:12px;color:#71858b;text-align:center">
        Equivale — Compare CLT e PJ com clareza.
      </div>
    </div>
  </div>
</body></html>`;

  return mailer().sendMail({
    from: settings().SMTP_FROM,
    to,
    subject,
    text,
    html
  });
}
