import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { HEALTH } from '../graphql/health';
import * as authService from '../services/authService';

const CHAVE_SESSAO = 'devclass:sessao';
const AuthContext = createContext(null);

function lerSessaoArmazenada() {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const apolloClient = useApolloClient();

  // status: 'restaurando' | 'autenticado' | 'nao_autenticado' | 'erro_rede'
  const [status, setStatus] = useState('restaurando');
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);

  const limparSessao = useCallback(async () => {
    sessionStorage.removeItem(CHAVE_SESSAO);
    setUsuario(null);
    setToken(null);
    setStatus('nao_autenticado');
    try {
      await apolloClient.clearStore();
    } catch {
      // clearStore pode falhar se não houver cache ativo; seguro ignorar.
    }
  }, [apolloClient]);

  const restaurarSessao = useCallback(async () => {
    const sessao = lerSessaoArmazenada();
    if (!sessao?.token) {
      setStatus('nao_autenticado');
      return;
    }

    setToken(sessao.token);
    setUsuario(sessao.usuario);

    try {
      const resultado = await apolloClient.query({
        query: HEALTH,
        fetchPolicy: 'network-only',
      });

      // Apenas uma resposta de autenticação explicitamente inválida
      // encerra a sessão; qualquer outro texto de health é aceito.
      if (resultado.errors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) {
        await limparSessao();
        return;
      }

      setStatus('autenticado');
    } catch (erro) {
      // TEMPORÁRIO: log de diagnóstico, remover depois de identificar a causa.
      console.error('[diagnostico restaurarSessao]', erro);

      const semAutenticacao = (erro.errors || erro.graphQLErrors)?.some(
        (e) => e.extensions?.code === 'UNAUTHENTICATED'
      );

      if (semAutenticacao) {
        await limparSessao();
        return;
      }

      // Falha de rede: mantemos os dados locais e avisamos a tela,
      // em vez de derrubar a sessão.
      setStatus('erro_rede');
    }
  }, [apolloClient, limparSessao]);

  useEffect(() => {
    restaurarSessao();
  }, [restaurarSessao]);

  useEffect(() => {
    function aoPerderSessao() {
      limparSessao();
    }
    window.addEventListener('devclass:sessao-invalida', aoPerderSessao);
    return () => window.removeEventListener('devclass:sessao-invalida', aoPerderSessao);
  }, [limparSessao]);

  const entrar = useCallback(async ({ email, senha }) => {
    const resultado = await authService.login({ email, senha });
    const sessao = { token: resultado.token, usuario: resultado.usuario };
    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    setToken(resultado.token);
    setUsuario(resultado.usuario);
    setStatus('autenticado');
    return resultado.usuario;
  }, []);

  const cadastrar = useCallback(async ({ nome, email, senha }) => {
    return authService.registrar({ nome, email, senha });
  }, []);

  const sair = useCallback(async () => {
    await limparSessao();
  }, [limparSessao]);

  const valor = {
    status,
    usuario,
    token,
    autenticado: status === 'autenticado',
    entrar,
    cadastrar,
    sair,
    tentarNovamente: restaurarSessao,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  }
  return contexto;
}
