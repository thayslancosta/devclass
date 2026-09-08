const gql = require('graphql-tag');

const aulaTypeDefs = gql`
  type Aula {
    id: ID!
    turmaId: ID!
    data: String!
    topicos: [String!]!
    status: String!
    createdAt: String
    updatedAt: String
  }

  input CriarAulaInput {
    turmaId: ID!
    data: String!
    topicos: [String!]
  }

  input AtualizarAulaInput {
    data: String
    topicos: [String!]
  }

  extend type Query {
    aulas(
      turmaId: ID!
      dataInicio: String
      dataFim: String
      status: String
    ): [Aula!]!
  }

  extend type Mutation {
    criarAula(input: CriarAulaInput!): Aula!
    atualizarAula(id: ID!, input: AtualizarAulaInput!): Aula!
    arquivarAula(id: ID!): Aula!
    restaurarAula(id: ID!): Aula!
  }
`;

module.exports = aulaTypeDefs;
