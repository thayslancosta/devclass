import { CombinedGraphQLErrors } from '@apollo/client/errors';

export function fmtData(valor) {
  if (!valor) return '';
  const [ano, mes, dia] = String(valor).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function fmtTimestamp(valor) {
  return valor ? new Date(valor).toLocaleString('pt-BR') : '';
}

export function infoErro(erro) {
  if (CombinedGraphQLErrors.is(erro)) {
    const primeiro = erro.errors[0];
    return {
      code: primeiro?.extensions?.code,
      msg: primeiro?.message || 'Ocorreu um erro inesperado.',
    };
  }
  return {
    code: 'NETWORK',
    msg: 'Não foi possível comunicar com o servidor. Verifique a conexão e tente novamente.',
  };
}

export const HABILIDADES = [
  ['speaking', 'Conversação'],
  ['listening', 'Compreensão oral'],
  ['reading', 'Leitura'],
  ['writing', 'Escrita'],
  ['grammar', 'Gramática'],
  ['vocabulary', 'Vocabulário'],
  ['pronunciation', 'Pronúncia'],
  ['participation', 'Participação'],
  ['outra', 'Outra habilidade'],
];

export const DESEMPENHOS = [
  ['destaque', 'Destaque'],
  ['adequado', 'Adequado'],
  ['precisa_de_atencao', 'Precisa de atenção'],
];