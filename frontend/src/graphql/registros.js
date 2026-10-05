import { gql } from '@apollo/client';

const CAMPOS_REGISTRO = gql`
  fragment CamposRegistro on RegistroDiario {
    id
    aulaId
    matriculaId
    observacaoGeral
    avaliacoes {
      habilidade
      desempenho
      observacao
      outraDescricao
    }
    mensagemIAOriginal
    mensagemEditada
    geradaEm
    status
  }
`;

export const REGISTROS = gql`
  query Registros($matriculaId: ID!, $status: String) {
    registros(matriculaId: $matriculaId, status: $status) {
      ...CamposRegistro
    }
  }
  ${CAMPOS_REGISTRO}
`;

export const ADICIONAR_REGISTRO = gql`
  mutation AdicionarRegistro($input: CriarRegistroInput!) {
    adicionarRegistro(input: $input) {
      ...CamposRegistro
    }
  }
  ${CAMPOS_REGISTRO}
`;

export const ATUALIZAR_REGISTRO = gql`
  mutation AtualizarRegistro($id: ID!, $input: AtualizarRegistroInput!) {
    atualizarRegistro(id: $id, input: $input) {
      ...CamposRegistro
    }
  }
  ${CAMPOS_REGISTRO}
`;

export const ARQUIVAR_REGISTRO = gql`
  mutation ArquivarRegistro($id: ID!) {
    arquivarRegistro(id: $id) {
      ...CamposRegistro
    }
  }
  ${CAMPOS_REGISTRO}
`;

export const RESTAURAR_REGISTRO = gql`
  mutation RestaurarRegistro($id: ID!) {
    restaurarRegistro(id: $id) {
      ...CamposRegistro
    }
  }
  ${CAMPOS_REGISTRO}
`;

export const GERAR_MENSAGEM = gql`
  mutation GerarMensagemDiaria($id: ID!) {
    gerarMensagemDiaria(id: $id) {
      ...CamposRegistro
    }
  }
  ${CAMPOS_REGISTRO}
`;

export const EDITAR_MENSAGEM = gql`
  mutation EditarMensagemDiaria($id: ID!, $texto: String!) {
    editarMensagemDiaria(id: $id, texto: $texto) {
      ...CamposRegistro
    }
  }
  ${CAMPOS_REGISTRO}
`;