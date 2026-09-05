const gql = require('graphql-tag');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Fase 2 — Turmas e períodos letivos
const turmaTypeDefs = require('./typeDefs/turmaTypeDefs');
const turmaResolvers = require('./resolvers/turmaResolvers');

// Fase 3 — Alunos, responsáveis e matrículas
const alunoTypeDefs = require('./typeDefs/alunoTypeDefs');
const alunoResolvers = require('./resolvers/alunoResolvers');
const matriculaTypeDefs = require('./typeDefs/matriculaTypeDefs');
const matriculaResolvers = require('./resolvers/matriculaResolvers');

// Fase 4 — Aulas e registros diários
const aulaTypeDefs = require('./typeDefs/aulaTypeDefs');
const aulaResolvers = require('./resolvers/aulaResolvers');
const registroTypeDefs = require('./typeDefs/registroTypeDefs');
const registroResolvers = require('./resolvers/registroResolvers');

// Base do schema. As próximas fases devem importar seus próprios
// typeDefs/resolvers aqui e mesclá-los, concatenando os arrays abaixo.
const baseTypeDefs = gql`
  type Query {
    health: String!
  }
`;
const typeDefs = [
  baseTypeDefs,
  turmaTypeDefs,
  alunoTypeDefs,
  matriculaTypeDefs,
  aulaTypeDefs,
  registroTypeDefs,
];

const resolvers = {
  Query: {
    health: (_parent, _args, context) => {
      if (!context.usuario) {
        return 'API funcionando, sem usuário autenticado.';
      }
      return `API funcionando. Usuário autenticado: ${context.usuario.email} (${context.usuario.perfil})`;
    },

   ...turmaResolvers.Query,
...alunoResolvers.Query,
...aulaResolvers.Query,
...registroResolvers.Query,
  },

Mutation: {
  ...turmaResolvers.Mutation,
  ...alunoResolvers.Mutation,
  ...matriculaResolvers.Mutation,
  ...aulaResolvers.Mutation,
  ...registroResolvers.Mutation,
},

  Aluno: {
    ...alunoResolvers.Aluno,
  },

  Matricula: {
    ...matriculaResolvers.Matricula,
  },
};

// Extrai e valida o Bearer Token para cada requisição GraphQL.
// Resolvers de outras fases devem usar context.usuario.id para
// filtrar por propriedade - nunca confiar em id vindo do cliente.
async function contexto({ req }) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { usuario: null };
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(payload.id);
    if (!usuario || !usuario.ativo) {
      return { usuario: null };
    }
    return {
      usuario: {
        id: usuario._id.toString(),
        email: usuario.email,
        perfil: usuario.perfil,
      },
    };
  } catch {
    return { usuario: null };
  }
}

module.exports = { typeDefs, resolvers, contexto };



