import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { MEUS_ALUNOS } from '../../graphql/alunos';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';

// Versão mínima da Fase 1: lista + filtro de situação do cadastro.
// Busca por nome, filtro de turma/semestre e "sem matrícula" ficam
// para a Fase 3 (Ramon), que deve reaproveitar esta consulta.
export default function MeusAlunosPage() {
  const [status, setStatus] = useState('ativo');

  const { data, loading, error } = useQuery(MEUS_ALUNOS, {
    variables: { status },
    fetchPolicy: 'cache-and-network',
  });

  return (
    <div>
      <h1>Meus alunos</h1>

      <div className="campo" style={{ maxWidth: 220 }}>
        <label className="campo__label" htmlFor="filtro-status">
          Situação do cadastro
        </label>
        <select
          id="filtro-status"
          className="campo__input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {loading && !data && <Loading texto="Carregando alunos..." />}
      {error && <ErrorMessage erro={error} />}

      {data && data.meusAlunos.length === 0 && (
        <EmptyState
          titulo="Nenhum aluno encontrado"
          descricao="Cadastre um aluno para começar a organizar suas turmas e matrículas."
        />
      )}

      {data && data.meusAlunos.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {data.meusAlunos.map((aluno) => (
            <li key={aluno.id} className="cartao">
              <strong>{aluno.nome}</strong>{' '}
              <span className="situacao-pill">{aluno.status}</span>
              {aluno.nomeResponsavel && (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--cor-texto-secundario)' }}>
                  Responsável: {aluno.nomeResponsavel}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
