const gql = require('graphql-tag');

const matriculaTypeDefs = gql`
  type Matricula {
    id: ID!
    alunoId: ID!
    turmaId: ID!
    periodoLetivo: String!
    status: String!
    aluno: Aluno
    turma: Turma
    createdAt: String!
    updatedAt: String!
  }

  extend type Aluno {
    matriculas: [Matricula!]!
  }

  extend type Mutation {
    matricularAluno(alunoId: ID!, turmaId: ID!): Matricula!
    encerrarMatricula(id: ID!): Matricula!
  }
`;

module.exports = matriculaTypeDefs;
