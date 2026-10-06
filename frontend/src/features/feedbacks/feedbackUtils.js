import { extrairMensagemErro } from '../../components/common/ErrorMessage';

// Só falhas conhecidas do conteúdo/estado individual permitem continuar.
export function interrompeSequencia(erro) {
  const erros = erro?.errors || erro?.graphQLErrors || [];
  return !erros.length || erros.some(({ extensions }) =>
    !['BAD_USER_INPUT', 'CONFLICT', 'NOT_FOUND'].includes(extensions?.code));
}

export function mensagemFeedback(erro) {
  const erros = erro?.errors || erro?.graphQLErrors || [];
  if (erros.some((item) => item.extensions?.code === 'IA_NOT_CONFIGURED')) {
    return 'IA não configurada. Você pode criar e editar feedbacks manualmente.';
  }
  if (erros.some((item) => item.extensions?.code === 'IA_UNAVAILABLE')) {
    return 'Serviço de IA indisponível. Nenhuma geração será repetida automaticamente.';
  }
  return extrairMensagemErro(erro);
}

export const chaveManual = (matriculaId, tipo) => `manual:${matriculaId}:${tipo}`;
export const feedbackAtivo = (lista, tipo) => lista?.find((item) => item.tipo === tipo && item.status === 'ativo');

export function visaoFeedbacks(lista, tipo, envio, incluirArquivados) {
  const ativo = feedbackAtivo(lista, tipo);
  return {
    ativo,
    ativoVisivel: ativo && (envio === 'todos' || ativo.statusEnvio === envio),
    historicos: incluirArquivados ? lista.filter((f) => f.tipo === tipo && f.status === 'arquivado'
      && (envio === 'todos' || f.statusEnvio === envio)) : [],
  };
}
