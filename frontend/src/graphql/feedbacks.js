import { gql } from '@apollo/client';

const CAMPOS_FEEDBACK = gql`
  fragment CamposFeedback on Feedback {
    id matriculaId tipo textoIAOriginal textoEditado geradoPorIA geradoEm
    statusEnvio enviadoEm status createdAt updatedAt
  }
`;

export const FEEDBACKS = gql`
  query Feedbacks($matriculaId: ID!, $tipo: String, $statusEnvio: String, $status: String) {
    feedbacks(matriculaId: $matriculaId, tipo: $tipo, statusEnvio: $statusEnvio, status: $status) {
      ...CamposFeedback
    }
  }
  ${CAMPOS_FEEDBACK}
`;

export const GERAR_FEEDBACKS = gql`
  mutation GerarFeedbacks($input: GerarFeedbacksInput!) {
    gerarFeedbacks(input: $input) { ...CamposFeedback }
  }
  ${CAMPOS_FEEDBACK}
`;

export const CRIAR_FEEDBACK_MANUAL = gql`
  mutation CriarFeedbackManual($input: CriarFeedbackManualInput!) {
    criarFeedbackManual(input: $input) { ...CamposFeedback }
  }
  ${CAMPOS_FEEDBACK}
`;

export const EDITAR_FEEDBACK = gql`
  mutation EditarFeedback($id: ID!, $texto: String!) {
    editarFeedback(id: $id, texto: $texto) { ...CamposFeedback }
  }
  ${CAMPOS_FEEDBACK}
`;

export const MARCAR_FEEDBACK_ENVIADO = gql`
  mutation MarcarFeedbackEnviado($id: ID!) {
    marcarFeedbackEnviado(id: $id) { ...CamposFeedback }
  }
  ${CAMPOS_FEEDBACK}
`;

export const DESMARCAR_FEEDBACK_ENVIADO = gql`
  mutation DesmarcarFeedbackEnviado($id: ID!) {
    desmarcarFeedbackEnviado(id: $id) { ...CamposFeedback }
  }
  ${CAMPOS_FEEDBACK}
`;

export const ARQUIVAR_FEEDBACK = gql`
  mutation ArquivarFeedback($id: ID!) {
    arquivarFeedback(id: $id) { ...CamposFeedback }
  }
  ${CAMPOS_FEEDBACK}
`;

export const RESTAURAR_FEEDBACK = gql`
  mutation RestaurarFeedback($id: ID!) {
    restaurarFeedback(id: $id) { ...CamposFeedback }
  }
  ${CAMPOS_FEEDBACK}
`;
