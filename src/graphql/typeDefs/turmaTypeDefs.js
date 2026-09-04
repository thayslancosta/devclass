const gql = require('graphql-tag');

const turmaTypeDefs = gql`
  type Encontro {
    diaSemana: String!
    horario: String!
  }

  type Turma {
    id: ID!
    nome: String!
    estagio: String!
    periodoLetivo: String!
    encontros: [Encontro!]!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  input EncontroInput {
    diaSemana: String!
    horario: String!
  }

  input TurmaInput {
    nome: String!
    estagio: String!
    periodoLetivo: String!
    encontros: [EncontroInput!]
  }

  extend type Query {
    periodosDisponiveis: [String!]!
    minhasTurmas(periodoLetivo: String, status: String): [Turma!]!
    turma(id: ID!): Turma
  }

        type Mutation {
    criarTurma(input: TurmaInput!): Turma!
    atualizarTurma(id: ID!, input: TurmaInput!): Turma!
    encerrarTurma(id: ID!): Turma!
    reativarTurma(id: ID!): Turma!
  }
`;

module.exports = turmaTypeDefs;