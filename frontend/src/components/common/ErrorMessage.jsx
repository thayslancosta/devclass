const MENSAGENS_POR_CODIGO = {
  UNAUTHENTICATED: 'Sua sessão expirou. Entre novamente.',
  FORBIDDEN: 'Você não tem permissão para esta ação.',
  BAD_USER_INPUT: 'Verifique os dados informados.',
  NOT_FOUND: 'Recurso não encontrado.',
  CONFLICT: 'Já existe um registro com esses dados.',
};

// Extrai uma mensagem legível de um erro do Apollo Client ou de uma
// chamada REST (que lança Error com .mensagem ou .message).
export function extrairMensagemErro(erro) {
  if (!erro) return 'Ocorreu um erro inesperado.';

  const graphQLErrors = erro.graphQLErrors || [];
  if (graphQLErrors.length > 0) {
    const primeiro = graphQLErrors[0];
    const codigo = primeiro.extensions?.code;
    if (codigo && MENSAGENS_POR_CODIGO[codigo]) {
      return primeiro.message || MENSAGENS_POR_CODIGO[codigo];
    }
    return primeiro.message || 'Ocorreu um erro inesperado.';
  }

  if (erro.networkError) {
    return 'Não foi possível conectar ao servidor. Tente novamente.';
  }

  return erro.mensagem || erro.message || 'Ocorreu um erro inesperado.';
}

export default function ErrorMessage({ erro, texto }) {
  const mensagem = texto || extrairMensagemErro(erro);
  if (!mensagem) return null;

  return (
    <div className="mensagem-erro" role="alert">
      {mensagem}
    </div>
  );
}
