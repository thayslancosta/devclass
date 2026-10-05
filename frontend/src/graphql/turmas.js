import { gql } from '@apollo/client';

const CAMPOS_TURMA = gql`
  fragment CamposTurma on Turma {
    id
    nome
    estagio
    periodoLetivo
    encontros { diaSemana horario }
    status
    createdAt
    updatedAt
  }
`;

export const PERIODOS_DISPONIVEIS = gql`
  query PeriodosDisponiveis {
    periodosDisponiveis
  }
`;

export const MINHAS_TURMAS = gql`
  query MinhasTurmas($periodoLetivo: String, $status: String) {
    minhasTurmas(periodoLetivo: $periodoLetivo, status: $status) {
      ...CamposTurma
    }
  }
  ${CAMPOS_TURMA}
`;

export const TURMA = gql`
  query Turma($id: ID!) {
    turma(id: $id) {
      ...CamposTurma
    }
  }
  ${CAMPOS_TURMA}
`;

export const CRIAR_TURMA = gql`
  mutation CriarTurma($input: TurmaInput!) {
    criarTurma(input: $input) {
      ...CamposTurma
    }
  }
  ${CAMPOS_TURMA}
`;

export const ATUALIZAR_TURMA = gql`
  mutation AtualizarTurma($id: ID!, $input: AtualizarTurmaInput!) {
    atualizarTurma(id: $id, input: $input) {
      ...CamposTurma
    }
  }
  ${CAMPOS_TURMA}
`;

export const ENCERRAR_TURMA = gql`
  mutation EncerrarTurma($id: ID!) {
    encerrarTurma(id: $id) {
      ...CamposTurma
    }
  }
  ${CAMPOS_TURMA}
`;

export const REATIVAR_TURMA = gql`
  mutation ReativarTurma($id: ID!) {
    reativarTurma(id: $id) {
      ...CamposTurma
    }
  }
  ${CAMPOS_TURMA}
`;
