
const form = document.getElementById('password-form');
const message = document.getElementById('message');

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

// Remove o token da barra de endereços e do histórico atual.
history.replaceState(null, '', '/definir-senha.html');

if (!token || !/^[a-f0-9]{64}$/.test(token)) {
  message.textContent = 'Link inválido. Solicite um novo link de acesso.';
  form.hidden = true;
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;
  const button = form.querySelector('button');

  if (password !== confirm) {
    message.textContent = 'As senhas não coincidem.';
    return;
  }

  if (password.length < 8 || password.length > 32) {
    message.textContent = 'A senha deve ter entre 8 e 32 caracteres.';
    return;
  }

  button.disabled = true;
  message.textContent = 'Salvando senha...';

  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ token, password })
    });

    const result = await response.json();

    if (!response.ok) {
      message.textContent = result.error || 'Não foi possível salvar a senha.';
      return;
    }

    form.hidden = true;
    message.textContent =
      'Senha definida! Redirecionando para o login...';
    window.location.replace('/?login=1');
  } catch {
    message.textContent = 'Erro de conexão. Tente novamente.';
  } finally {
    button.disabled = false;
  }
});

for (const id of ['password', 'confirm']) {
  const input = document.getElementById(id);
  if (!input) continue;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Mostrar senha';
  button.style.margin = '6px';
  button.style.width = 'auto';
  button.style.padding = '7px 10px';
  input.insertAdjacentElement('afterend', button);
  button.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.textContent = visible ? 'Ocultar senha' : 'Mostrar senha';
  });
}
