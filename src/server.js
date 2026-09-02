require('dotenv').config();

const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express5');

const conectarBanco = require('./database');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { typeDefs, resolvers, contexto } = require('./graphql/schema');
const { tratadorDeErros } = require('./utils/erros');

async function iniciar() {
  // 1) Conectar ao banco ANTES de abrir a porta HTTP.
  //    Se falhar, não anunciamos servidor funcionando.
  try {
    await conectarBanco();
  } catch (err) {
    console.error('[server] Falha ao conectar ao MongoDB. Servidor não será iniciado.', err.message);
    process.exit(1);
  }

  const app = express();
  app.use(express.json());

  // Rotas REST
  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);

  // Apollo / GraphQL
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  app.use('/graphql', expressMiddleware(apollo, { context: contexto }));

  // Middleware de erro deve ser o último
  app.use(tratadorDeErros);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[server] Rodando em http://localhost:${PORT}`);
    console.log(`[server] GraphQL disponível em http://localhost:${PORT}/graphql`);
  });
}

iniciar();
