const gql = require('graphql-tag');

const feedbackTypeDefs = gql`
  type Feedback {
    id: ID!
    matriculaId: ID!
    matricula: Matricula
    tipo: String!
    textoIAOriginal: String
    textoEditado: String!
    geradoPorIA: Boolean!
    geradoEm: String
    statusEnvio: String!
    enviadoEm: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  input CriarFeedbackManualInput {
    matriculaId: ID!
    tipo: String!
    texto: String!
  }

  input GerarFeedbacksInput {
    matriculaIds: [ID!]!
    tipo: String!
  }

  extend type Query {
    feedback(id: ID!): Feedback
    feedbacks(
      matriculaId: ID!
      tipo: String
      statusEnvio: String
      status: String
    ): [Feedback!]!
  }

  extend type Mutation {
    gerarFeedbacks(input: GerarFeedbacksInput!): [Feedback!]!
    criarFeedbackManual(input: CriarFeedbackManualInput!): Feedback!
    editarFeedback(id: ID!, texto: String!): Feedback!
    marcarFeedbackEnviado(id: ID!): Feedback!
    desmarcarFeedbackEnviado(id: ID!): Feedback!
    arquivarFeedback(id: ID!): Feedback!
    restaurarFeedback(id: ID!): Feedback!
  }
`;

module.exports = feedbackTypeDefs;
