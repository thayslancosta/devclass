import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { extrairMensagemErro } from '../../components/common/ErrorMessage';

export const PERIODO_VALIDO = /^\d{4}\.[12]$/;

// Valores aceitos pelo backend e seus rótulos de interface.
export const GENEROS = [
  ['masculino', 'Masculino'],
  ['feminino', 'Feminino'],
  ['neutro', 'Neutro'],
];

export function rotuloGenero(valor) {
  const encontrado = GENEROS.find(([chave]) => chave === valor);
  return encontrado ? encontrado[1] : valor || 'Não informado';
}

export function rotuloCadastro(status) {
  return status === 'ativo' ? 'Cadastro ativo' : 'Cadastro inativo';
}

export function rotuloMatricula(status) {
  return status === 'ativa' ? 'Matrícula ativa' : 'Matrícula encerrada';
}

// Matrícula do aluno em uma turma específica (ativa ou encerrada).
export function matriculaDaTurma(aluno, turmaId) {
  return aluno?.matriculas?.find((matricula) => matricula.turmaId === turmaId) || null;
}

// Matrícula do aluno em um semestre, em QUALQUER situação. O backend permite
// no máximo uma por aluno e período, inclusive depois do encerramento.
export function matriculaNoPeriodo(aluno, periodoLetivo) {
  return aluno?.matriculas?.find((matricula) => matricula.periodoLetivo === periodoLetivo) || null;
}

// Comparação de nomes sem diferenciar maiúsculas nem acentos.
export function normalizarTexto(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Erros GraphQL trazem a mensagem do backend; qualquer outra falha
// (rede, proxy, resposta inválida) vira um aviso curto de comunicação.
export function mensagemDeErro(erro) {
  if (!erro) return '';
  if (CombinedGraphQLErrors.is(erro)) return extrairMensagemErro(erro);
  return 'Não foi possível comunicar com o servidor. Verifique a conexão e tente novamente.';
}
