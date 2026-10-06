import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { FEEDBACKS } from '../../graphql/feedbacks';

export default function useFeedbacks(itens) {
  const client = useApolloClient();
  const [consultas, setConsultas] = useState({});
  const montado = useRef(false);
  const ids = JSON.stringify(itens.map(({ matricula }) => matricula.id));
  const atualizar = useCallback(async (id) => {
    if (!montado.current) return [];
    setConsultas((atual) => ({ ...atual, [id]: { ...atual[id], loading: true, error: null } }));
    try {
      const { data } = await client.query({
        query: FEEDBACKS, variables: { matriculaId: id, status: 'todos' }, fetchPolicy: 'network-only',
      });
      if (montado.current) setConsultas((atual) => ({ ...atual, [id]: { lista: data.feedbacks, loading: false, error: null } }));
      return data.feedbacks;
    } catch (error) {
      if (montado.current) setConsultas((atual) => ({ ...atual, [id]: { ...atual[id], loading: false, error } }));
      throw error;
    }
  }, [client]);

  useEffect(() => {
    montado.current = true;
    // As consultas são independentes; somente as gerações devem ser sequenciais.
    for (const id of JSON.parse(ids)) atualizar(id).catch(() => {});
    return () => { montado.current = false; };
  }, [ids, atualizar]);

  function aplicar(feedback) {
    if (!montado.current) return;
    setConsultas((atual) => {
      const consulta = atual[feedback.matriculaId] || {};
      const lista = consulta.lista || [];
      return { ...atual, [feedback.matriculaId]: {
        ...consulta, lista: [feedback, ...lista.filter(({ id }) => id !== feedback.id)],
      } };
    });
  }
  return { client, consultas, atualizar, aplicar, montado };
}
