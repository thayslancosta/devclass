const BASE_URL = import.meta.env.VITE_REST_BASE_URL || '';

// Lança um Error com .mensagem (igual ao formato { mensagem } do backend)
// para que ErrorMessage.jsx consiga extrair o texto de forma consistente.
async function tratarResposta(resposta) {
  let corpo = null;
  const temConteudo = resposta.status !== 204;

  if (temConteudo) {
    try {
      corpo = await resposta.json();
    } catch {
      corpo = null;
    }
  }

  if (!resposta.ok) {
    const erro = new Error(corpo?.mensagem || 'Erro de comunicação com o servidor.');
    erro.mensagem = corpo?.mensagem || 'Erro de comunicação com o servidor.';
    erro.status = resposta.status;
    throw erro;
  }

  return corpo;
}

export async function registrar({ nome, email, senha }) {
  const resposta = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha }),
  });
  return tratarResposta(resposta);
}

export async function login({ email, senha }) {
  const resposta = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  return tratarResposta(resposta);
}
