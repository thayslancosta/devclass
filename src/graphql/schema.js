const gql = require('graphql-tag');
const { GraphQLError } = require('graphql');
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

const feedbackTypeDefs = require('./typeDefs/feedbackTypeDefs');
const feedbackResolvers = require('./resolvers/feedbackResolvers');

// Schema base.
// As próximas fases devem importar seus próprios typeDefs e resolvers.
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
  feedbackTypeDefs,
];

// Converte datas do MongoDB para o padrão ISO.
// Exemplo: 2026-09-06T21:39:59.553Z
function formatarDataHora(valor) {
  if (!valor) {
    return null;
  }

  return new Date(valor).toISOString();
}

// Resolvers reutilizados pelas entidades que possuem timestamps.
const timestampResolvers = {
  createdAt: (objeto) =>
    formatarDataHora(objeto.createdAt),

  updatedAt: (objeto) =>
    formatarDataHora(objeto.updatedAt),
};

const resolvers = {
  Query: {
    health: (_parent, _args, context) => {
      if (!context.usuario) {
        throw new GraphQLError('Usuário não autenticado.', {
          extensions: {
            code: 'UNAUTHENTICATED',
          },
        });
      }

      return (
        `API funcionando. Usuário autenticado: ` +
        `${context.usuario.email} (${context.usuario.perfil})`
      );
    },

    ...turmaResolvers.Query,
    ...alunoResolvers.Query,
    ...aulaResolvers.Query,
    ...registroResolvers.Query,
    ...feedbackResolvers.Query,
  },

  Mutation: {
    ...turmaResolvers.Mutation,
    ...alunoResolvers.Mutation,
    ...matriculaResolvers.Mutation,
    ...aulaResolvers.Mutation,
    ...registroResolvers.Mutation,
    ...feedbackResolvers.Mutation,
  },

  // Formata os timestamps das turmas.
  Turma: {
    ...timestampResolvers,
  },

  // Mantém os resolvers relacionais do aluno
  // e acrescenta a formatação dos timestamps.
  Aluno: {
    ...alunoResolvers.Aluno,
    ...timestampResolvers,
  },

  // Mantém os resolvers de aluno e turma da matrícula
  // e acrescenta a formatação dos timestamps.
  Matricula: {
    ...matriculaResolvers.Matricula,
    ...timestampResolvers,
  },

  // aulaResolvers.Aula contém o formatador de Aula.data.
  // timestampResolvers formata createdAt e updatedAt.
  Aula: {
    ...aulaResolvers.Aula,
    ...timestampResolvers,
  },

  Feedback: {
    ...feedbackResolvers.Feedback,
    ...timestampResolvers,
    geradoEm: (feedback) => formatarDataHora(feedback.geradoEm),
    enviadoEm: (feedback) => formatarDataHora(feedback.enviadoEm),
  },

  // Formata os timestamps e o momento de geração
  // da futura mensagem produzida pela IA.
  RegistroDiario: {
    ...timestampResolvers,

    geradaEm: (registro) =>
      formatarDataHora(registro.geradaEm),
  },
};

// Extrai e valida o Bearer Token em cada requisição GraphQL.
async function contexto({ req }) {
  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {
    return {
      usuario: null,
    };
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const usuario = await Usuario.findById(payload.id);

    if (!usuario || !usuario.ativo) {
      return {
        usuario: null,
      };
    }

    return {
      usuario: {
        id: usuario._id.toString(),
        email: usuario.email,
        perfil: usuario.perfil,
      },
    };
  } catch {
    return {
      usuario: null,
    };
  }
}

module.exports = {
  typeDefs,
  resolvers,
  contexto,
};