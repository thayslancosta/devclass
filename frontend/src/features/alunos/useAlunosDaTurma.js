import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { ALUNOS_DA_TURMA } from '../../graphql/alunos';
import { matriculaDaTurma } from './alunosUtils';

// Alunos de uma turma já pareados com a matrícula correspondente àquela turma.
// status filtra a matrícula: 'ativa' (operacional), 'encerrada' ou 'todas'.
//
// Ponto de integração para as fases seguintes: cada item traz
// { aluno, matricula }, e matricula.id é o ID a usar em registros e feedbacks.
export function useAlunosDaTurma(turmaId, status = 'ativa') {
  const consulta = useQuery(ALUNOS_DA_TURMA, {
    variables: { turmaId, status },
    fetchPolicy: 'cache-and-network',
    skip: !turmaId,
  });

  const alunos = consulta.data?.alunosDaTurma;
  const itens = useMemo(
    () => (alunos || []).map((aluno) => ({ aluno, matricula: matriculaDaTurma(aluno, turmaId) })),
    [alunos, turmaId],
  );

  return { ...consulta, itens };
}
