import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || '/graphql';

// Lido a cada requisição (nunca capturado no momento da criação do client),
// para que o token mais atual sempre seja enviado.
function obterTokenAtual() {
  try {
    const bruto = sessionStorage.getItem('devclass:sessao');
    if (!bruto) return null;
    const sessao = JSON.parse(bruto);
    return sessao?.token || null;
  } catch {
    return null;
  }
}

// Callback central: quando qualquer consulta/mutation GraphQL falhar com
// UNAUTHENTICATED, dispara um evento que o AuthContext escuta para encerrar
// a sessão. Mantido como link simples para não depender de pacotes extras.
const authLink = new ApolloLink((operation, forward) => {
  const token = obterTokenAtual();
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }));
  return forward(operation);
});

const errorLink = new ApolloLink((operation, forward) => {
  return forward(operation).map((resultado) => {
    const semAutenticacao = resultado.errors?.some(
      (erro) => erro.extensions?.code === 'UNAUTHENTICATED'
    );
    if (semAutenticacao) {
      window.dispatchEvent(new CustomEvent('devclass:sessao-invalida'));
    }
    return resultado;
  });
});

const httpLink = new HttpLink({ uri: GRAPHQL_URL });

const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;
