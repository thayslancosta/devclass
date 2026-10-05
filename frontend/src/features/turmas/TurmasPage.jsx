import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';
import { usePeriodo } from '../../contexts/PeriodoContext';
import {
  ATUALIZAR_TURMA,
  CRIAR_TURMA,
  ENCERRAR_TURMA,
  MINHAS_TURMAS,
  PERIODOS_DISPONIVEIS,
  REATIVAR_TURMA,
} from '../../graphql/turmas';
import TurmaForm from './TurmaForm';
import './turmas.css';

const PERIODOS_VALIDOS = /^\d{4}\.[12]$/;

function rotuloDia(valor) {
  return {
    segunda: 'Segunda-feira',
    terca: 'Terça-feira',
    quarta: 'Quarta-feira',
    quinta: 'Quinta-feira',
    sexta: 'Sexta-feira',
    sabado: 'Sábado',
    domingo: 'Domingo',
  }[valor] || valor;
}

export default function TurmasPage() {
  const { periodoAtual, periodoSelecionado, selecionarPeriodo } = usePeriodo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formulario, setFormulario] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const periodoDaUrl = searchParams.get('periodo');
  const periodo = PERIODOS_VALIDOS.test(periodoDaUrl || '')
    ? periodoDaUrl
    : periodoSelecionado || periodoAtual;
  const status = ['ativa', 'encerrada', 'todas'].includes(searchParams.get('status'))
    ? searchParams.get('status')
    : 'ativa';

  const periodosQuery = useQuery(PERIODOS_DISPONIVEIS, {
    fetchPolicy: 'cache-and-network',
  });
  const turmasQuery = useQuery(MINHAS_TURMAS, {
    variables: { periodoLetivo: periodo, status },
    fetchPolicy: 'cache-and-network',
  });
  const [criarTurma] = useMutation(CRIAR_TURMA);
  const [atualizarTurma] = useMutation(ATUALIZAR_TURMA);
  const [encerrarTurma, encerramento] = useMutation(ENCERRAR_TURMA);
  const [reativarTurma, reativacao] = useMutation(REATIVAR_TURMA);
  const erroOperacao = encerramento.error || reativacao.error;
  const alterandoStatus = encerramento.loading || reativacao.loading;

  useEffect(() => {
    if (periodoSelecionado !== periodo) selecionarPeriodo(periodo);
  }, [periodo, periodoSelecionado, selecionarPeriodo]);

  useEffect(() => {
    if (!PERIODOS_VALIDOS.test(periodoDaUrl || '')) {
      const proxima = new URLSearchParams(searchParams);
      proxima.set('periodo', periodo);
      if (!proxima.has('status')) proxima.set('status', status);
      setSearchParams(proxima, { replace: true });
    }
  }, [periodo, periodoDaUrl, searchParams, setSearchParams, status]);

  const periodos = useMemo(() => {
    const disponiveis = periodosQuery.data?.periodosDisponiveis || [];
    return [...new Set([periodoAtual, periodo, ...disponiveis])]
      .filter((item) => PERIODOS_VALIDOS.test(item))
      .sort((a, b) => b.localeCompare(a));
  }, [periodo, periodoAtual, periodosQuery.data]);

  function atualizarFiltro(campo, valor) {
    const proxima = new URLSearchParams(searchParams);
    proxima.set(campo, valor);
    setSearchParams(proxima);
    if (campo === 'periodo') selecionarPeriodo(valor);
  }

  async function salvarTurma(dados) {
    if (formulario.turma) {
      const { nome, estagio, encontros } = dados;
      await atualizarTurma({
        variables: {
          id: formulario.turma.id,
          input: { nome, estagio, encontros },
        },
      });
    } else {
      await criarTurma({ variables: { input: dados } });
    }
    setFormulario(null);
    Promise.all([turmasQuery.refetch(), periodosQuery.refetch()]).catch(() => {
      // Erros de atualização são apresentados pelos estados das consultas.
    });
  }

  async function alterarStatus() {
    const acao = confirmacao.turma.status === 'ativa' ? encerrarTurma : reativarTurma;
    try {
      await acao({ variables: { id: confirmacao.turma.id } });
      setConfirmacao(null);
      await turmasQuery.refetch();
    } catch {
      // O erro da mutation é mostrado junto aos filtros.
    }
  }

  const turmas = turmasQuery.data?.minhasTurmas || [];

  return (
    <section className="pagina-turmas">
      <header className="pagina-turmas__topo">
        <div>
          <p className="sobretitulo">Área do professor</p>
          <h1>Turmas</h1>
          <p className="texto-secundario">Organize suas turmas e acompanhe cada semestre letivo.</p>
        </div>
        <Button onClick={() => setFormulario({ turma: null })}>Nova turma</Button>
      </header>

      <div className="turmas-filtros">
        <label className="campo">
          <span className="campo__label">Semestre</span>
          <select
            className="campo__input"
            value={periodo}
            onChange={(evento) => atualizarFiltro('periodo', evento.target.value)}
          >
            {periodos.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="campo">
          <span className="campo__label">Situação</span>
          <select
            className="campo__input"
            value={status}
            onChange={(evento) => atualizarFiltro('status', evento.target.value)}
          >
            <option value="ativa">Ativas</option>
            <option value="encerrada">Encerradas</option>
            <option value="todas">Todas</option>
          </select>
        </label>
      </div>

      {periodosQuery.error && <ErrorMessage erro={periodosQuery.error} />}
      {erroOperacao && <ErrorMessage erro={erroOperacao} />}
      {turmasQuery.loading && !turmasQuery.data && <Loading texto="Carregando turmas..." />}
      {turmasQuery.error && <ErrorMessage erro={turmasQuery.error} />}
      {!turmasQuery.loading && turmasQuery.data && turmas.length === 0 && (
        <EmptyState
          titulo="Nenhuma turma neste filtro"
          descricao={status === 'ativa'
            ? 'Não há turmas ativas no semestre ' + periodo + '. Crie uma turma ou consulte as encerradas.'
            : 'Não há turmas para o semestre ' + periodo + ' com a situação selecionada.'}
          acao={status === 'ativa'
            ? <Button onClick={() => setFormulario({ turma: null })}>Criar turma</Button>
            : null}
        />
      )}

      <div className="turmas-lista">
        {turmas.map((turma) => (
          <article className="turma-card" key={turma.id}>
            <div className="turma-card__principal">
              <div>
                <div className="turma-card__titulo">
                  <h2>{turma.nome}</h2>
                  <span className={'situacao-pill situacao-pill--' + turma.status}>
                    {turma.status === 'ativa' ? 'Ativa' : 'Encerrada'}
                  </span>
                </div>
                <p className="texto-secundario">
                  {turma.estagio} <span aria-hidden="true">·</span> Semestre {turma.periodoLetivo}
                </p>
                <ul className="turma-card__encontros" aria-label="Encontros semanais">
                  {turma.encontros.map((encontro, indice) => (
                    <li key={encontro.diaSemana + '-' + encontro.horario + '-' + indice}>
                      {rotuloDia(encontro.diaSemana)} às {encontro.horario}
                    </li>
                  ))}
                </ul>
              </div>
              <Link className="botao botao--secundario" to={'/turmas/' + turma.id}>
                Abrir turma
              </Link>
            </div>
            <div className="turma-card__acoes">
              <Button variant="secundario" onClick={() => setFormulario({ turma })}>Editar</Button>
              <Button
                variant={turma.status === 'ativa' ? 'perigo' : 'secundario'}
                onClick={() => setConfirmacao({ turma })}
              >
                {turma.status === 'ativa' ? 'Encerrar turma' : 'Reativar turma'}
              </Button>
            </div>
          </article>
        ))}
      </div>

      {formulario && (
        <TurmaForm
          key={formulario.turma?.id || 'nova'}
          turma={formulario.turma}
          periodoInicial={periodo}
          periodos={periodos}
          onCancelar={() => setFormulario(null)}
          onSalvar={salvarTurma}
        />
      )}

      <ConfirmDialog
        aberto={Boolean(confirmacao)}
        titulo={confirmacao?.turma.status === 'ativa' ? 'Encerrar turma?' : 'Reativar turma?'}
        descricao={confirmacao?.turma.status === 'ativa'
          ? 'A turma será marcada como encerrada. Matrículas, aulas e registros relacionados não mudam automaticamente.'
          : 'A turma voltará a aparecer como ativa. Matrículas, aulas e registros relacionados não mudam automaticamente.'}
        textoConfirmar={confirmacao?.turma.status === 'ativa' ? 'Encerrar turma' : 'Reativar turma'}
        variantConfirmar={confirmacao?.turma.status === 'ativa' ? 'perigo' : 'primario'}
        busy={alterandoStatus}
        onCancelar={() => setConfirmacao(null)}
        onConfirmar={alterarStatus}
      />
    </section>
  );
}
