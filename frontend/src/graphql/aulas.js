import { gql } from '@apollo/client';

const CAMPOS_AULA = gql`
  fragment CamposAula on Aula {
    id
    turmaId
    data
    topicos
    status
  }
`;

export const AULAS = gql`
  query Aulas($turmaId: ID!, $status: String) {
    aulas(turmaId: $turmaId, status: $status) {
      ...CamposAula
    }
  }
  ${CAMPOS_AULA}
`;

export const CRIAR_AULA = gql`
  mutation CriarAula($input: CriarAulaInput!) {
    criarAula(input: $input) {
      ...CamposAula
    }
  }
  ${CAMPOS_AULA}
`;

export const ATUALIZAR_AULA = gql`
  mutation AtualizarAula($id: ID!, $input: AtualizarAulaInput!) {
    atualizarAula(id: $id, input: $input) {
      ...CamposAula
    }
  }
  ${CAMPOS_AULA}
`;

export const ARQUIVAR_AULA = gql`
  mutation ArquivarAula($id: ID!) {
    arquivarAula(id: $id) {
      ...CamposAula
    }
  }
  ${CAMPOS_AULA}
`;

export const RESTAURAR_AULA = gql`
  mutation RestaurarAula($id: ID!) {
    restaurarAula(id: $id) {
      ...CamposAula
    }
  }
  ${CAMPOS_AULA}
`;