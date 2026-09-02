const gql = require('graphql-tag');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Base do schema. As próximas fases devem importar seus próprios
// typeDefs/resolvers aqui e mesclá-los (ex: com @graphql-tools/merge,
// ou simplesmente concatenando arrays de typeDefs/resolvers).
const typeDefs = gql`
  type Query {
    health: String!
  }
`;

const resolvers = {
  Query: {
    health: (_parent, _args, context) => {
      if (!context.usuario) {
        return 'API funcionando, sem usuário autenticado.';
      }
      return `API funcionando. Usuário autenticado: ${context.usuario.email} (${context.usuario.perfil})`;
    },
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
