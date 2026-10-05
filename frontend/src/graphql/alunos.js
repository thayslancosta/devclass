import { gql } from '@apollo/client';

// Matrícula com o contexto usado na navegação e nos filtros locais.
// O ID da matrícula (e não o do aluno) é o que identifica registros,
// feedbacks e o encerramento nas fases seguintes.
const CAMPOS_MATRICULA = gql`
  fragment CamposMatricula on Matricula {
    id
    alunoId
    turmaId
    periodoLetivo
    status
    turma { id nome }
  }
`;

const CAMPOS_ALUNO = gql`
  fragment CamposAluno on Aluno {
    id
    nome
    generoGramatical
    nomeResponsavel
    generoResponsavel
    contatoResponsavel
    status
    matriculas {
      ...CamposMatricula
    }
  }
  ${CAMPOS_MATRICULA}
`;

// status filtra o CADASTRO: 'ativo' (padrão), 'inativo' ou 'todos'.
export const MEUS_ALUNOS = gql`
  query MeusAlunos($status: String) {
    meusAlunos(status: $status) {
      ...CamposAluno
    }
  }
  ${CAMPOS_ALUNO}
`;

export const ALUNO = gql`
  query Aluno($id: ID!) {
    aluno(id: $id) {
      ...CamposAluno
    }
  }
  ${CAMPOS_ALUNO}
`;

// status filtra a MATRÍCULA na turma: 'ativa' (padrão), 'encerrada' ou 'todas'.
// Com 'ativa' o backend também oculta alunos com cadastro inativo.
export const ALUNOS_DA_TURMA = gql`
  query AlunosDaTurma($turmaId: ID!, $status: String) {
    alunosDaTurma(turmaId: $turmaId, status: $status) {
      ...CamposAluno
    }
  }
  ${CAMPOS_ALUNO}
`;

export const CRIAR_ALUNO = gql`
  mutation CriarAluno($input: CriarAlunoInput!) {
    criarAluno(input: $input) {
      ...CamposAluno
    }
  }
  ${CAMPOS_ALUNO}
`;

export const ATUALIZAR_ALUNO = gql`
  mutation AtualizarAluno($id: ID!, $input: AtualizarAlunoInput!) {
    atualizarAluno(id: $id, input: $input) {
      ...CamposAluno
    }
  }
  ${CAMPOS_ALUNO}
`;

export const INATIVAR_ALUNO = gql`
  mutation InativarAluno($id: ID!) {
    inativarAluno(id: $id) {
      ...CamposAluno
    }
  }
  ${CAMPOS_ALUNO}
`;

export const REATIVAR_ALUNO = gql`
  mutation ReativarAluno($id: ID!) {
    reativarAluno(id: $id) {
      ...CamposAluno
    }
  }
  ${CAMPOS_ALUNO}
`;

export const MATRICULAR_ALUNO = gql`
  mutation MatricularAluno($alunoId: ID!, $turmaId: ID!) {
    matricularAluno(alunoId: $alunoId, turmaId: $turmaId) {
      ...CamposMatricula
    }
  }
  ${CAMPOS_MATRICULA}
`;

// id é o ID da MATRÍCULA. Não existe mutation para restaurar ou transferir.
export const ENCERRAR_MATRICULA = gql`
  mutation EncerrarMatricula($id: ID!) {
    encerrarMatricula(id: $id) {
      ...CamposMatricula
    }
  }
  ${CAMPOS_MATRICULA}
`;
