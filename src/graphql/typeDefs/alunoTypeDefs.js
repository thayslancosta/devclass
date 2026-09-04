const gql = require('graphql-tag');

const alunoTypeDefs = gql`
  type Aluno {
    id: ID!
    nome: String!
    generoGramatical: String!
    nomeResponsavel: String
    generoResponsavel: String
    contatoResponsavel: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  input CriarAlunoInput {
    nome: String!
    generoGramatical: String!
    nomeResponsavel: String
    generoResponsavel: String
    contatoResponsavel: String
  }

  """
  Todos os campos são opcionais: apenas o que for enviado é alterado.
  Enviar null em um campo de responsável limpa aquele campo.
  """
  input AtualizarAlunoInput {
    nome: String
    generoGramatical: String
    nomeResponsavel: String
    generoResponsavel: String
    contatoResponsavel: String
  }

  extend type Query {
    aluno(id: ID!): Aluno
    alunosDaTurma(turmaId: ID!, status: String): [Aluno!]!
  }

  extend type Mutation {
    criarAluno(input: CriarAlunoInput!): Aluno!
    atualizarAluno(id: ID!, input: AtualizarAlunoInput!): Aluno!
    inativarAluno(id: ID!): Aluno!
    reativarAluno(id: ID!): Aluno!
  }
`;

module.exports = alunoTypeDefs;
