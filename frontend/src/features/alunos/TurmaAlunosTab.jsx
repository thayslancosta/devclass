import { useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { useApolloClient, useMutation } from '@apollo/client/react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Field from '../../components/common/Field';
import Loading from '../../components/common/Loading';
import { ENCERRAR_MATRICULA } from '../../graphql/alunos';
import ErroDeConsulta from './ErroDeConsulta';
import MatricularAlunoDialog from './MatricularAlunoDialog';
import { mensagemDeErro, rotuloCadastro, rotuloMatricula } from './alunosUtils';
import { atualizarConsultasDeAlunos } from './atualizarConsultas';
import { useAlunosDaTurma } from './useAlunosDaTurma';
import './alunos.css';

const FILTROS_MATRICULA = ['ativa', 'encerrada', 'todas'];

// Uma turma encerrada não recebe matrículas, então o vazio não sugere matricular.
function estadoVazio(filtro, turmaAtiva) {
  if (filtro === 'encerrada') {
    return {
      titulo: 'Nenhuma matrícula encerrada',
      descricao: 'Matrículas encerradas desta turma ficam preservadas aqui como histórico.',
    };
  }
  if (filtro === 'todas') {
    return {
      titulo: 'Esta turma ainda não tem matrículas',
      descricao: turmaAtiva
        ? 'Matricule alunos já cadastrados em Meus alunos.'
        : 'Nenhuma matrícula foi registrada nesta turma.',
    };
  }
  return {
    titulo: 'Nenhum aluno com matrícula ativa',
    descricao: turmaAtiva
      ? 'Matricule um aluno já cadastrado ou consulte as matrículas encerradas.'
      : 'Use "Encerradas" ou "Todas" para consultar o histórico da turma.',
  };
}

// Aba Alunos da turma (/turmas/:turmaId/alunos). A turma vem do Outlet do
// cabeçalho; o filtro é de MATRÍCULA, não de cadastro do aluno.
export default function TurmaAlunosTab() {
  const { turma } = useOutletContext();
  const client = useApolloClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [encerrarMatricula] = useMutation(ENCERRAR_MATRICULA);
  const [matriculando, setMatriculando] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);
  const [encerrando, setEncerrando] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [erroAcao, setErroAcao] = useState(null);

  const filtro = FILTROS_MATRICULA.includes(searchParams.get('matriculas'))
    ? searchParams.get('matriculas')
    : 'ativa';
  const { itens, data, loading, error, refetch } = useAlunosDaTurma(turma.id, filtro);
  const turmaAtiva = turma.status === 'ativa';
  const vazio = estadoVazio(filtro, turmaAtiva);

  function mudarFiltro(valor) {
    const proxima = new URLSearchParams(searchParams);
    proxima.set('matriculas', valor);
    setSearchParams(proxima, { replace: true });
  }

  async function encerrar() {
    if (!confirmacao || encerrando) return;
    const { aluno, matricula } = confirmacao;
    setErroAcao(null);
    setEncerrando(true);
    try {
      // O backend encerra pelo ID da matrícula, nunca pelo ID do aluno.
      await encerrarMatricula({ variables: { id: matricula.id } });
      await atualizarConsultasDeAlunos(client);
      setSucesso('Matrícula de ' + aluno.nome + ' encerrada. Ela continua no histórico: filtro '
        + '"Encerradas" e perfil do aluno.');
    } catch (erro) {
      setErroAcao(erro);
    } finally {
      setEncerrando(false);
      setConfirmacao(null);
    }
  }

  return (
    <section className="turma-alunos">
      <header className="turma-alunos__topo">
        <div>
          <h2>Alunos da turma</h2>
          <p className="alunos-secundario">Matrículas de {turma.nome} no semestre {turma.periodoLetivo}.</p>
        </div>
        {turmaAtiva && (
          <Button onClick={() => { setSucesso(''); setErroAcao(null); setMatriculando(true); }}>
            Matricular aluno
          </Button>
        )}
      </header>

      {!turmaAtiva && (
        <p className="alunos-aviso">
          Turma encerrada: não recebe novas matrículas. O histórico continua disponível.
        </p>
      )}

      <div className="turma-alunos__filtro">
        <Field
          id="turma-alunos-filtro"
          label="Situação da matrícula"
          as="select"
          value={filtro}
          onChange={(evento) => mudarFiltro(evento.target.value)}
        >
          <option value="ativa">Ativas</option>
          <option value="encerrada">Encerradas</option>
          <option value="todas">Todas</option>
        </Field>
        <p className="alunos-secundario">
          {filtro === 'ativa'
            ? 'Visão operacional: matrículas ativas de alunos com cadastro ativo. Use "Todas" para o '
              + 'histórico, que inclui alunos com cadastro inativo.'
            : 'Visão histórica. A situação da matrícula é independente da situação do cadastro do aluno.'}
        </p>
      </div>

      {sucesso && <p className="alunos-sucesso" role="status">{sucesso}</p>}
      {erroAcao && <ErrorMessage texto={mensagemDeErro(erroAcao)} />}

      {loading && !data && <Loading texto="Carregando alunos da turma..." />}
      {error && <ErroDeConsulta erro={error} onTentarNovamente={() => refetch()} />}

      {data && itens.length === 0 && (
        <EmptyState
          titulo={vazio.titulo}
          descricao={vazio.descricao}
          acao={turmaAtiva && filtro !== 'encerrada'
            ? <Button onClick={() => { setSucesso(''); setMatriculando(true); }}>Matricular aluno</Button>
            : null}
        />
      )}

      {itens.length > 0 && (
        <ul className="alunos-lista">
          {itens.map(({ aluno, matricula }) => {
            const perfil = '/alunos/' + aluno.id + (matricula ? '?matricula=' + matricula.id : '');
            return (
              <li className="alunos-item" key={aluno.id}>
                <div className="alunos-item__principal">
                  <div className="alunos-item__titulo">
                    <Link className="alunos-item__nome" to={perfil}>{aluno.nome}</Link>
                    {matricula ? (
                      <span className={'situacao-pill alunos-pill--' + matricula.status}>
                        {rotuloMatricula(matricula.status)}
                      </span>
                    ) : (
                      <span className="situacao-pill">Matrícula não localizada</span>
                    )}
                    <span className={'situacao-pill alunos-pill--' + aluno.status}>
                      {rotuloCadastro(aluno.status)}
                    </span>
                  </div>
                  <p className="alunos-secundario">
                    {aluno.nomeResponsavel
                      ? 'Responsável: ' + aluno.nomeResponsavel
                      : 'Sem responsável informado'}
                  </p>
                </div>
                <div className="alunos-item__acoes">
                  <Link className="botao botao--secundario" to={perfil}>Ver perfil</Link>
                  {matricula?.status === 'ativa' && (
                    <Button
                      variant="perigo"
                      onClick={() => { setSucesso(''); setErroAcao(null); setConfirmacao({ aluno, matricula }); }}
                    >
                      Encerrar matrícula
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {matriculando && (
        <MatricularAlunoDialog
          turma={turma}
          onFechar={() => setMatriculando(false)}
          onMatriculado={(aluno) => {
            setMatriculando(false);
            setSucesso('Matrícula de ' + aluno.nome + ' criada em ' + turma.nome + ' (' + turma.periodoLetivo + ').');
          }}
        />
      )}

      <ConfirmDialog
        aberto={Boolean(confirmacao)}
        titulo="Encerrar matrícula?"
        descricao={confirmacao
          ? 'A matrícula de ' + confirmacao.aluno.nome + ' em ' + turma.nome + ' (' + turma.periodoLetivo
            + ') será encerrada. O histórico é preservado e o cadastro do aluno continua como está. '
            + 'Uma matrícula encerrada não pode ser restaurada nem transferida, e o aluno não poderá '
            + 'ser matriculado de novo em ' + turma.periodoLetivo + '.'
          : ''}
        textoConfirmar="Encerrar matrícula"
        variantConfirmar="perigo"
        busy={encerrando}
        onCancelar={() => setConfirmacao(null)}
        onConfirmar={encerrar}
      />
    </section>
  );
}
