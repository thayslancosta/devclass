import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Field from '../../components/common/Field';
import Loading from '../../components/common/Loading';
import { usePeriodo } from '../../contexts/PeriodoContext';
import { MEUS_ALUNOS } from '../../graphql/alunos';
import { MINHAS_TURMAS, PERIODOS_DISPONIVEIS } from '../../graphql/turmas';
import AlunoForm from './AlunoForm';
import ErroDeConsulta from './ErroDeConsulta';
import SituacaoAlunoDialog from './SituacaoAlunoDialog';
import {
  PERIODO_VALIDO,
  matriculaNoPeriodo,
  mensagemDeErro,
  normalizarTexto,
  rotuloCadastro,
  rotuloMatricula,
} from './alunosUtils';
import './alunos.css';

const SITUACOES = ['ativo', 'inativo', 'todos'];
const VINCULOS = ['todos', 'com', 'sem'];

// Meus alunos: todos os cadastros do professor autenticado, com ou sem
// matrícula. A consulta carrega status "todos" uma vez; situação, busca,
// semestre, turma e ausência de matrícula são filtros locais.
export default function MeusAlunosPage() {
  const { periodoAtual, periodoSelecionado, selecionarPeriodo } = usePeriodo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busca, setBusca] = useState('');
  const [formulario, setFormulario] = useState(null);
  const [alvoSituacao, setAlvoSituacao] = useState(null);
  const [sucesso, setSucesso] = useState('');
  const [erroAcao, setErroAcao] = useState(null);

  const periodoDaUrl = searchParams.get('periodo');
  const periodo = PERIODO_VALIDO.test(periodoDaUrl || '')
    ? periodoDaUrl
    : periodoSelecionado || periodoAtual;
  const situacao = SITUACOES.includes(searchParams.get('situacao'))
    ? searchParams.get('situacao')
    : 'ativo';
  const vinculo = VINCULOS.includes(searchParams.get('matricula'))
    ? searchParams.get('matricula')
    : 'todos';
  const turmaDaUrl = searchParams.get('turma') || '';

  const alunosQuery = useQuery(MEUS_ALUNOS, {
    variables: { status: 'todos' },
    fetchPolicy: 'cache-and-network',
  });
  const periodosQuery = useQuery(PERIODOS_DISPONIVEIS, {
    fetchPolicy: 'cache-and-network',
  });
  const turmasQuery = useQuery(MINHAS_TURMAS, {
    variables: { periodoLetivo: periodo, status: 'todas' },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (periodoSelecionado !== periodo) selecionarPeriodo(periodo);
  }, [periodo, periodoSelecionado, selecionarPeriodo]);

  useEffect(() => {
    if (!PERIODO_VALIDO.test(periodoDaUrl || '')) {
      const proxima = new URLSearchParams(searchParams);
      proxima.set('periodo', periodo);
      setSearchParams(proxima, { replace: true });
    }
  }, [periodo, periodoDaUrl, searchParams, setSearchParams]);

  const alunos = alunosQuery.data?.meusAlunos;

  const periodos = useMemo(() => {
    const dasTurmas = periodosQuery.data?.periodosDisponiveis || [];
    const dasMatriculas = (alunos || []).flatMap((aluno) =>
      aluno.matriculas.map((matricula) => matricula.periodoLetivo),
    );
    return [...new Set([periodoAtual, periodo, ...dasTurmas, ...dasMatriculas])]
      .filter((item) => PERIODO_VALIDO.test(item))
      .sort((a, b) => b.localeCompare(a));
  }, [alunos, periodo, periodoAtual, periodosQuery.data]);

  const turmas = useMemo(
    () => [...(turmasQuery.data?.minhasTurmas || [])].sort((a, b) => a.nome.localeCompare(b.nome)),
    [turmasQuery.data],
  );
  // Um ID de turma que não pertence ao semestre selecionado não filtra nada.
  const turmaId = !turmasQuery.data || turmas.some((turma) => turma.id === turmaDaUrl)
    ? turmaDaUrl
    : '';

  const filtrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    return (alunos || []).filter((aluno) => {
      if (situacao !== 'todos' && aluno.status !== situacao) return false;
      if (termo && !normalizarTexto(aluno.nome).includes(termo)) return false;

      // Qualquer matrícula no semestre conta, inclusive a encerrada.
      const matricula = matriculaNoPeriodo(aluno, periodo);
      if (vinculo === 'sem' && matricula) return false;
      if (vinculo === 'com' && !matricula) return false;
      if (turmaId && matricula?.turmaId !== turmaId) return false;
      return true;
    });
  }, [alunos, busca, periodo, situacao, turmaId, vinculo]);

  function atualizarFiltros(mudancas) {
    const proxima = new URLSearchParams(searchParams);
    Object.entries(mudancas).forEach(([campo, valor]) => {
      if (valor) proxima.set(campo, valor);
      else proxima.delete(campo);
    });
    setSearchParams(proxima);
  }

  function mudarPeriodo(valor) {
    // As turmas pertencem a um semestre: trocar o semestre limpa o filtro de turma.
    atualizarFiltros({ periodo: valor, turma: '' });
    selecionarPeriodo(valor);
  }

  function mudarVinculo(valor) {
    atualizarFiltros({
      matricula: valor === 'todos' ? '' : valor,
      ...(valor === 'sem' ? { turma: '' } : {}),
    });
  }

  function mudarTurma(valor) {
    atualizarFiltros({
      turma: valor,
      ...(valor && vinculo === 'sem' ? { matricula: '' } : {}),
    });
  }

  // A lista depende das três consultas: a nova tentativa refaz todas.
  function recarregar() {
    return Promise.all([alunosQuery.refetch(), turmasQuery.refetch(), periodosQuery.refetch()]);
  }

  function limparFiltros() {
    setBusca('');
    setSearchParams(new URLSearchParams({ periodo }));
  }

  function aoSalvar(aluno, { criado, semAlteracoes }) {
    setFormulario(null);
    setErroAcao(null);
    if (semAlteracoes) {
      setSucesso('Nenhuma alteração para salvar no cadastro de ' + aluno.nome + '.');
    } else {
      setSucesso(criado
        ? 'Aluno cadastrado: ' + aluno.nome + '. Para matricular, abra uma turma e use a aba Alunos.'
        : 'Cadastro atualizado: ' + aluno.nome + '.');
    }
  }

  function aoAlterarSituacao(aluno, resultado) {
    setAlvoSituacao(null);
    setErroAcao(null);
    setSucesso(resultado === 'inativado'
      ? 'Cadastro inativado: ' + aluno.nome + '. O histórico foi preservado; consulte em "Inativos".'
      : 'Cadastro reativado: ' + aluno.nome + '.');
  }

  const carregando = alunosQuery.loading && !alunos;
  const semCadastros = Boolean(alunos) && alunos.length === 0;
  const filtrosAlterados = Boolean(busca) || situacao !== 'ativo' || vinculo !== 'todos' || Boolean(turmaId);

  return (
    <section className="pagina-alunos">
      <header className="pagina-alunos__topo">
        <div>
          <p className="alunos-sobretitulo">Área do professor</p>
          <h1>Meus alunos</h1>
          <p className="alunos-secundario">
            Seus cadastros, com ou sem matrícula. O mesmo cadastro é reutilizado a cada semestre.
          </p>
        </div>
        <Button onClick={() => { setSucesso(''); setFormulario({ aluno: null }); }}>Novo aluno</Button>
      </header>

      <div className="alunos-filtros">
        <Field
          id="alunos-busca"
          label="Buscar por nome"
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Parte do nome"
        />
        <Field
          id="alunos-situacao"
          label="Situação do cadastro"
          as="select"
          value={situacao}
          onChange={(evento) => atualizarFiltros({ situacao: evento.target.value })}
        >
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="todos">Todos</option>
        </Field>
        <Field
          id="alunos-periodo"
          label="Semestre"
          as="select"
          value={periodo}
          onChange={(evento) => mudarPeriodo(evento.target.value)}
        >
          {periodos.map((item) => <option key={item} value={item}>{item}</option>)}
        </Field>
        <Field
          id="alunos-vinculo"
          label={'Matrícula em ' + periodo}
          as="select"
          value={vinculo}
          onChange={(evento) => mudarVinculo(evento.target.value)}
        >
          <option value="todos">Todos os alunos</option>
          <option value="com">Com matrícula neste semestre</option>
          <option value="sem">Sem matrícula neste semestre</option>
        </Field>
        <Field
          id="alunos-turma"
          label={'Turma de ' + periodo}
          as="select"
          value={turmaId}
          onChange={(evento) => mudarTurma(evento.target.value)}
          disabled={vinculo === 'sem'}
        >
          <option value="">Todas as turmas</option>
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}{turma.status === 'encerrada' ? ' (encerrada)' : ''}
            </option>
          ))}
        </Field>
      </div>
      <p className="alunos-secundario alunos-filtros__nota">
        A situação do cadastro (ativo ou inativo) é diferente da situação da matrícula (ativa ou
        encerrada). &ldquo;Sem matrícula neste semestre&rdquo; considera qualquer matrícula em {periodo},
        inclusive encerrada.
      </p>

      {sucesso && <p className="alunos-sucesso" role="status">{sucesso}</p>}
      {erroAcao && <ErrorMessage texto={mensagemDeErro(erroAcao)} />}

      {carregando && <Loading texto="Carregando alunos..." />}
      {alunosQuery.error && (
        <ErroDeConsulta erro={alunosQuery.error} onTentarNovamente={recarregar} />
      )}
      {!alunosQuery.error && turmasQuery.error && (
        <ErroDeConsulta
          erro={turmasQuery.error}
          texto={'Não foi possível carregar as turmas de ' + periodo + ' para o filtro.'}
          onTentarNovamente={() => turmasQuery.refetch()}
        />
      )}

      {semCadastros && (
        <EmptyState
          titulo="Nenhum aluno cadastrado"
          descricao="Cadastre seus alunos uma vez e reutilize o cadastro nas matrículas de cada semestre."
          acao={<Button onClick={() => setFormulario({ aluno: null })}>Cadastrar aluno</Button>}
        />
      )}

      {alunos && alunos.length > 0 && filtrados.length === 0 && (
        <EmptyState
          titulo="Nenhum aluno neste filtro"
          descricao={vinculo === 'sem'
            ? 'Todos os cadastros deste filtro já têm matrícula em ' + periodo + '.'
            : 'Nenhum cadastro corresponde à busca e aos filtros selecionados.'}
          acao={filtrosAlterados
            ? <Button variant="secundario" onClick={limparFiltros}>Limpar filtros</Button>
            : <Button onClick={() => setFormulario({ aluno: null })}>Cadastrar aluno</Button>}
        />
      )}

      {filtrados.length > 0 && (
        <>
          <p className="alunos-secundario alunos-contagem">
            {filtrados.length === 1 ? '1 aluno' : filtrados.length + ' alunos'}
          </p>
          <ul className="alunos-lista">
            {filtrados.map((aluno) => {
              const matricula = matriculaNoPeriodo(aluno, periodo);
              return (
                <li className="alunos-item" key={aluno.id}>
                  <div className="alunos-item__principal">
                    <div className="alunos-item__titulo">
                      <Link className="alunos-item__nome" to={'/alunos/' + aluno.id}>{aluno.nome}</Link>
                      <span className={'situacao-pill alunos-pill--' + aluno.status}>
                        {rotuloCadastro(aluno.status)}
                      </span>
                    </div>
                    <p className="alunos-secundario">
                      {aluno.nomeResponsavel
                        ? 'Responsável: ' + aluno.nomeResponsavel
                        : 'Sem responsável informado'}
                    </p>
                    <p className="alunos-secundario">
                      {matricula ? (
                        <>
                          {periodo}:{' '}
                          <Link to={'/turmas/' + matricula.turmaId + '/alunos'}>
                            {matricula.turma?.nome || 'Turma indisponível'}
                          </Link>
                          {' · '}
                          <span className={'situacao-pill alunos-pill--' + matricula.status}>
                            {rotuloMatricula(matricula.status)}
                          </span>
                        </>
                      ) : (
                        'Sem matrícula em ' + periodo
                      )}
                    </p>
                  </div>
                  <div className="alunos-item__acoes">
                    <Link className="botao botao--secundario" to={'/alunos/' + aluno.id}>
                      Ver perfil
                    </Link>
                    <Button
                      variant="secundario"
                      onClick={() => { setSucesso(''); setFormulario({ aluno }); }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant={aluno.status === 'ativo' ? 'perigo' : 'secundario'}
                      onClick={() => { setSucesso(''); setErroAcao(null); setAlvoSituacao(aluno); }}
                    >
                      {aluno.status === 'ativo' ? 'Inativar' : 'Reativar'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {formulario && (
        <AlunoForm
          key={formulario.aluno?.id || 'novo'}
          aluno={formulario.aluno}
          onCancelar={() => setFormulario(null)}
          onSalvo={aoSalvar}
        />
      )}

      <SituacaoAlunoDialog
        aluno={alvoSituacao}
        onFechar={() => setAlvoSituacao(null)}
        onConcluido={aoAlterarSituacao}
        onErro={(erro) => { setAlvoSituacao(null); setErroAcao(erro); }}
      />
    </section>
  );
}
