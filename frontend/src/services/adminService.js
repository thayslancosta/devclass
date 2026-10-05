const BASE_URL = import.meta.env.VITE_REST_BASE_URL || '';

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

// O backend devolve _id (padrão do MongoDB); normalizamos para id
// aqui, sem exigir nenhuma alteração no backend.
function normalizarUsuario(usuario) {
  if (!usuario) return usuario;
  const { _id, ...resto } = usuario;
  return { id: _id ?? usuario.id, ...resto };
}

export async function listarUsuarios({ token, perfil, ativo } = {}) {
  const params = new URLSearchParams();
  if (perfil) params.set('perfil', perfil);
  if (ativo !== undefined && ativo !== null) params.set('ativo', String(ativo));

  const query = params.toString() ? `?${params.toString()}` : '';

  const resposta = await fetch(`${BASE_URL}/admin/usuarios${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const lista = await tratarResposta(resposta);
  return Array.isArray(lista) ? lista.map(normalizarUsuario) : lista;
}

export async function alterarStatusUsuario({ token, id, ativo }) {
  const resposta = await fetch(`${BASE_URL}/admin/usuarios/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ativo }),
  });

  const usuario = await tratarResposta(resposta);
  return normalizarUsuario(usuario);
}
