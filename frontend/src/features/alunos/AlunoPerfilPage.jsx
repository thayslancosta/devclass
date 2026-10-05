import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';
import { usePeriodo } from '../../contexts/PeriodoContext';
import { ALUNO } from '../../graphql/alunos';
import AlunoForm from './AlunoForm';
import ErroDeConsulta from './ErroDeConsulta';
import PerfilHistorico from './PerfilHistorico';
import SituacaoAlunoDialog from './SituacaoAlunoDialog';
import { mensagemDeErro, rotuloCadastro, rotuloGenero, rotuloMatricula } from './alunosUtils';
import './alunos.css';

// Perfil do aluno (/alunos/:alunoId). Tudo é carregado pelo ID da URL, e a
// matrícula histórica selecionada fica em ?matricula=<id>, para que a página
// possa ser recarregada ou aberta por link direto.
export default function AlunoPerfilPage() {
  const { alunoId } = useParams();
  const { periodoSelecionado } = usePeriodo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editando, setEditando] = useState(false);
  const [alvoSituacao, setAlvoSituacao] = useState(null);
  const [sucesso, setSucesso] = useState('');
  const [erroAcao, setErroAcao] = useState(null);

  const { data, loading, error, refetch } = useQuery(ALUNO, {
    variables: { id: alunoId },
    fetchPolicy: 'cache-and-network',
  });
  const aluno = data?.aluno;

  const voltar = <Link className="alunos-voltar" to="/alunos">← Voltar a Meus alunos</Link>;

  if (loading && !data) return <Loading texto="Carregando aluno..." />;
  if (error && !aluno) {
    return (
      <section className="pagina-aluno">
        {voltar}
        <ErroDeConsulta erro={error} onTentarNovamente={() => refetch()} />
      </section>
    );
  }
  if (!aluno) {
    return (
      <EmptyState
        titulo="Aluno não encontrado"
        descricao="O cadastro pode não existir ou não estar disponível para esta conta."
        acao={<Link className="botao botao--secundario" to="/alunos">Voltar a Meus alunos</Link>}
      />
    );
  }

  // O backend devolve o histórico do semestre mais recente para o mais antigo.
  const matriculas = aluno.matriculas;
  const matriculaDaUrl = searchParams.get('matricula');
  const matriculaSelecionada =
    matriculas.find((matricula) => matricula.id === matriculaDaUrl)
    || matriculas.find((matricula) => matricula.periodoLetivo === periodoSelecionado)
    || matriculas[0]
    || null;
  const temResponsavel = Boolean(
    aluno.nomeResponsavel || aluno.generoResponsavel || aluno.contatoResponsavel,
  );

  function selecionarMatricula(id) {
    const proxima = new URLSearchParams(searchParams);
    proxima.set('matricula', id);
    setSearchParams(proxima, { replace: true });
  }

  return (
    <section className="pagina-aluno">
      {voltar}
      <header className="pagina-aluno__topo">
        <div>
          <p className="alunos-sobretitulo">Perfil do aluno</p>
          <div className="alunos-item__titulo">
            <h1>{aluno.nome}</h1>
            <span className={'situacao-pill alunos-pill--' + aluno.status}>
              {rotuloCadastro(aluno.status)}
            </span>
          </div>
        </div>
        <div className="pagina-aluno__acoes">
          <Button variant="secundario" onClick={() => { setSucesso(''); setEditando(true); }}>
            Editar cadastro
          </Button>
          <Button
            variant={aluno.status === 'ativo' ? 'perigo' : 'secundario'}
            onClick={() => { setSucesso(''); setErroAcao(null); setAlvoSituacao(aluno); }}
          >
            {aluno.status === 'ativo' ? 'Inativar cadastro' : 'Reativar cadastro'}
          </Button>
        </div>
      </header>

      {sucesso && <p className="alunos-sucesso" role="status">{sucesso}</p>}
      {erroAcao && <ErrorMessage texto={mensagemDeErro(erroAcao)} />}
      {error && <ErroDeConsulta erro={error} onTentarNovamente={() => refetch()} />}

      <section className="perfil-secao" aria-labelledby="perfil-cadastro-titulo">
        <h2 id="perfil-cadastro-titulo">Cadastro</h2>
        <dl className="perfil-dados">
          <div>
            <dt>Gênero gramatical</dt>
            <dd>{rotuloGenero(aluno.generoGramatical)}</dd>
          </div>
          <div>
            <dt>Situação do cadastro</dt>
            <dd>{aluno.status === 'ativo' ? 'Ativo' : 'Inativo'}</dd>
          </div>
          {temResponsavel ? (
            <>
              <div>
                <dt>Responsável</dt>
                <dd>{aluno.nomeResponsavel || 'Não informado'}</dd>
              </div>
              <div>
                <dt>Gênero do responsável</dt>
                <dd>{rotuloGenero(aluno.generoResponsavel)}</dd>
              </div>
              <div>
                <dt>Contato do responsável</dt>
                <dd>{aluno.contatoResponsavel || 'Não informado'}</dd>
              </div>
            </>
          ) : (
            <div>
              <dt>Responsável</dt>
              <dd>Sem responsável informado</dd>
            </div>
          )}
        </dl>
        {aluno.status === 'inativo' && (
          <p className="alunos-aviso">
            Cadastro inativo: não recebe novas matrículas e fica fora das listas operacionais. As
            matrículas e o histórico abaixo continuam preservados.
          </p>
        )}
      </section>

      <section className="perfil-secao" aria-labelledby="perfil-matriculas-titulo">
        <h2 id="perfil-matriculas-titulo">Matrículas</h2>
        {matriculas.length === 0 ? (
          <EmptyState
            titulo="Nenhuma matrícula"
            descricao='Para matricular este aluno, abra uma turma ativa e use "Matricular aluno" na aba Alunos.'
            acao={<Link className="botao botao--secundario" to="/turmas">Ir para Turmas</Link>}
          />
        ) : (
          <>
            <p className="alunos-secundario">
              Selecione uma matrícula para ver o histórico daquele semestre. A situação da matrícula
              (ativa ou encerrada) é independente da situação do cadastro.
            </p>
            <div className="perfil-matriculas" role="group" aria-label="Matrículas do aluno">
              {matriculas.map((matricula) => {
                const selecionada = matricula.id === matriculaSelecionada.id;
                return (
                  <button
                    key={matricula.id}
                    type="button"
                    className={'perfil-matricula' + (selecionada ? ' selecionada' : '')}
                    aria-pressed={selecionada}
                    onClick={() => selecionarMatricula(matricula.id)}
                  >
                    <span className="perfil-matricula__periodo">Semestre {matricula.periodoLetivo}</span>
                    <span className="perfil-matricula__turma">
                      {matricula.turma?.nome || 'Turma indisponível'}
                    </span>
                    <span className={'situacao-pill alunos-pill--' + matricula.status}>
                      {rotuloMatricula(matricula.status)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {matriculaSelecionada && (
        <section className="perfil-secao" aria-labelledby="perfil-historico-titulo">
          <h2 id="perfil-historico-titulo">Histórico do semestre {matriculaSelecionada.periodoLetivo}</h2>
          <p className="alunos-secundario">
            {matriculaSelecionada.turma ? (
              <Link to={'/turmas/' + matriculaSelecionada.turmaId + '/alunos'}>
                {matriculaSelecionada.turma.nome}
              </Link>
            ) : (
              'Turma indisponível'
            )}
            {' · '}{rotuloMatricula(matriculaSelecionada.status)}
          </p>
          <PerfilHistorico
            key={matriculaSelecionada.id}
            aluno={aluno}
            matricula={matriculaSelecionada}
          />
        </section>
      )}

      {editando && (
        <AlunoForm
          aluno={aluno}
          onCancelar={() => setEditando(false)}
          onSalvo={(salvo, { semAlteracoes }) => {
            setEditando(false);
            setErroAcao(null);
            setSucesso(semAlteracoes
              ? 'Nenhuma alteração para salvar.'
              : 'Cadastro atualizado: ' + salvo.nome + '.');
          }}
        />
      )}

      <SituacaoAlunoDialog
        aluno={alvoSituacao}
        onFechar={() => setAlvoSituacao(null)}
        onConcluido={(alvo, resultado) => {
          setAlvoSituacao(null);
          setErroAcao(null);
          setSucesso(resultado === 'inativado'
            ? 'Cadastro inativado. Matrículas e histórico foram preservados.'
            : 'Cadastro reativado.');
        }}
        onErro={(erro) => { setAlvoSituacao(null); setErroAcao(erro); }}
      />
    </section>
  );
}
