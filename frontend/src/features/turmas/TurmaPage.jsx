import { useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';
import { ENCERRAR_TURMA, REATIVAR_TURMA, TURMA } from '../../graphql/turmas';
import './turmas.css';

const DIAS_ROTULOS = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export default function TurmaPage() {
  const { turmaId } = useParams();
  const [confirmarStatus, setConfirmarStatus] = useState(false);
  const { data, loading, error, refetch } = useQuery(TURMA, {
    variables: { id: turmaId },
    fetchPolicy: 'cache-and-network',
  });
  const [encerrar, encerramento] = useMutation(ENCERRAR_TURMA);
  const [reativar, reativacao] = useMutation(REATIVAR_TURMA);
  const turma = data?.turma;
  const alterando = encerramento.loading || reativacao.loading;
  const erroAcao = encerramento.error || reativacao.error;

  async function alterarStatus() {
    const executar = turma.status === 'ativa' ? encerrar : reativar;
    try {
      await executar({ variables: { id: turma.id } });
      setConfirmarStatus(false);
      await refetch();
    } catch {
      // O erro da mutation é exibido no cabeçalho da turma.
    }
  }

  if (loading && !data) return <Loading texto="Carregando turma..." />;
  if (error) return <ErrorMessage erro={error} />;
  if (!turma) {
    return (
      <EmptyState
        titulo="Turma não encontrada"
        descricao="A turma pode não estar disponível para esta conta."
        acao={<Link className="botao botao--secundario" to="/turmas">Voltar às turmas</Link>}
      />
    );
  }

  return (
    <section className="pagina-turma">
      <Link className="link-voltar" to="/turmas">← Voltar às turmas</Link>
      <header className="pagina-turma__topo">
        <div>
          <p className="sobretitulo">Semestre {turma.periodoLetivo} · {turma.estagio}</p>
          <h1>{turma.nome}</h1>
          <ul className="turma-card__encontros" aria-label="Encontros semanais">
            {turma.encontros.map((encontro, indice) => (
              <li key={encontro.diaSemana + '-' + encontro.horario + '-' + indice}>
                {DIAS_ROTULOS[encontro.diaSemana] || encontro.diaSemana} às {encontro.horario}
              </li>
            ))}
          </ul>
        </div>
        <span className={'situacao-pill situacao-pill--' + turma.status}>
          {turma.status === 'ativa' ? 'Ativa' : 'Encerrada'}
        </span>
      </header>
      {erroAcao && <ErrorMessage erro={erroAcao} />}
      <nav className="turma-abas" aria-label="Seções da turma">
        <NavLink to="alunos" className={({ isActive }) => 'turma-aba' + (isActive ? ' ativa' : '')}>Alunos</NavLink>
        <NavLink to="aulas" className={({ isActive }) => 'turma-aba' + (isActive ? ' ativa' : '')}>Aulas</NavLink>
        <NavLink to="feedbacks" className={({ isActive }) => 'turma-aba' + (isActive ? ' ativa' : '')}>Feedbacks</NavLink>
      </nav>
      <div className="turma-conteudo"><Outlet context={{ turma }} /></div>
      <div className="pagina-turma__acoes">
        <Button
          variant={turma.status === 'ativa' ? 'perigo' : 'secundario'}
          onClick={() => setConfirmarStatus(true)}
          disabled={alterando}
        >
          {turma.status === 'ativa' ? 'Encerrar turma' : 'Reativar turma'}
        </Button>
      </div>
      <ConfirmDialog
        aberto={confirmarStatus}
        titulo={turma.status === 'ativa' ? 'Encerrar turma?' : 'Reativar turma?'}
        descricao="Matrículas, aulas e registros relacionados não mudam automaticamente."
        textoConfirmar={turma.status === 'ativa' ? 'Encerrar turma' : 'Reativar turma'}
        variantConfirmar={turma.status === 'ativa' ? 'perigo' : 'primario'}
        busy={alterando}
        onCancelar={() => setConfirmarStatus(false)}
        onConfirmar={alterarStatus}
      />
    </section>
  );
}

export function TurmaTabPlaceholder({ titulo, descricao }) {
  return <EmptyState titulo={titulo} descricao={descricao} />;
}
