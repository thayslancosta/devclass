const gql = require('graphql-tag');

const registroTypeDefs = gql`
  type Avaliacao {
    habilidade: String!
    desempenho: String!
    observacao: String
    outraDescricao: String
  }

  type RegistroDiario {
    id: ID!
    aulaId: ID!
    matriculaId: ID!
    observacaoGeral: String
    avaliacoes: [Avaliacao!]!
    mensagemIAOriginal: String
    mensagemEditada: String
    geradaEm: String
    status: String!
    createdAt: String
    updatedAt: String
  }

  input AvaliacaoInput {
    habilidade: String!
    desempenho: String!
    observacao: String
    outraDescricao: String
  }

  input CriarRegistroInput {
    aulaId: ID!
    matriculaId: ID!
    observacaoGeral: String
    avaliacoes: [AvaliacaoInput!]
  }

  input AtualizarRegistroInput {
    observacaoGeral: String
    avaliacoes: [AvaliacaoInput!]
  }

  extend type Query {
    registros(
      matriculaId: ID!
      dataInicio: String
      dataFim: String
      status: String
    ): [RegistroDiario!]!
  }

  extend type Mutation {
    adicionarRegistro(input: CriarRegistroInput!): RegistroDiario!
    atualizarRegistro(
      id: ID!
      input: AtualizarRegistroInput!
    ): RegistroDiario!
    arquivarRegistro(id: ID!): RegistroDiario!
    restaurarRegistro(id: ID!): RegistroDiario!
    editarMensagemDiaria(id: ID!, texto: String!): RegistroDiario!
  }
`;

module.exports = registroTypeDefs;