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
import FeedbacksArea from '../feedbacks/FeedbacksArea';
import Abas from '../../components/common/Abas';
import { contextoPerfil } from './perfilContexto';
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

  const matriculas = aluno.matriculas;
  const { selecionada: matriculaSelecionada, aba, historicoImplicito } = contextoPerfil(matriculas, searchParams, periodoSelecionado);
  const matriculaAtual = matriculas.find((m) => m.periodoLetivo === periodoSelecionado);
  function selecionarAba(valor) {
    const proxima = new URLSearchParams(searchParams);
    proxima.set('aba', valor);
    setSearchParams(proxima, { replace: true });
  }
  const temResponsavel = Boolean(
    aluno.nomeResponsavel || aluno.generoResponsavel || aluno.contatoResponsavel,
  );

  function selecionarMatricula(id) {
    const proxima = new URLSearchParams(searchParams);
    proxima.set('matricula', id);
    proxima.delete('feedback');
    setSearchParams(proxima, { replace: true });
  }

  return (
    <section className="pagina-aluno">
      {voltar}
      <header className="pagina-aluno__topo">
        <div>
          <p className="alunos-sobretitulo">Perfil do aluno</p>
          {aluno.nomeResponsavel && <p className="alunos-secundario">Responsável: {aluno.nomeResponsavel}</p>}
          <div className="alunos-item__titulo">
            <h1>{aluno.nome}</h1>
            <span className={'situacao-pill alunos-pill--' + aluno.status}>
              {rotuloCadastro(aluno.status)}
            </span>
          </div>
        </div>
      </header>
      {matriculaSelecionada && <p className="perfil-contexto">
        <Link to={`/turmas/${matriculaSelecionada.turmaId}/alunos`}>{matriculaSelecionada.turma?.nome || 'Turma'}</Link>
        {' · Semestre '}{matriculaSelecionada.periodoLetivo}{' · '}{rotuloMatricula(matriculaSelecionada.status)}
      </p>}
      {historicoImplicito && <p className="alunos-aviso">Sem matrícula em {periodoSelecionado}. Você está consultando o histórico de {matriculaSelecionada.periodoLetivo}.</p>}
      {matriculas.length > 0 && !matriculaSelecionada && <p role="alert">A matrícula do link não está disponível. Escolha um semestre abaixo.</p>}
      {matriculas.length > 0 && <details className="perfil-secao">
        <summary>Ver semestres anteriores</summary>
        <div className="perfil-matriculas" role="group" aria-label="Escolher matrícula">
          {matriculas.map((m) => <button className={'perfil-matricula' + (m.id === matriculaSelecionada?.id ? ' selecionada' : '')}
            key={m.id} type="button" aria-pressed={m.id === matriculaSelecionada?.id} onClick={() => selecionarMatricula(m.id)}>
            {m.turma?.nome || 'Turma'} · {m.periodoLetivo} · {rotuloMatricula(m.status)}
          </button>)}
        </div>
      </details>}
      {matriculaAtual && matriculaAtual.id !== matriculaSelecionada?.id && <Button variant="secundario" onClick={() => selecionarMatricula(matriculaAtual.id)}>Voltar ao semestre {matriculaAtual.periodoLetivo}</Button>}
      {!matriculas.length && <EmptyState titulo="Sem matrícula" descricao="Abra uma turma ativa e use Matricular aluno. O cadastro continua disponível na aba Dados."
        acao={<Link to="/turmas">Ir para Turmas</Link>} />}
      <Abas id="perfil-aba" label="Conteúdo do aluno" atual={aba} onChange={selecionarAba}
        itens={[['registros', 'Registros'], ['feedbacks', 'Feedbacks'], ['dados', 'Dados']]} />
      <div id="perfil-aba-painel" role="tabpanel" aria-labelledby={`perfil-aba-${aba}`}>

      {sucesso && <p className="alunos-sucesso" role="status">{sucesso}</p>}
      {erroAcao && <ErrorMessage texto={mensagemDeErro(erroAcao)} />}
      {error && <ErroDeConsulta erro={error} onTentarNovamente={() => refetch()} />}

      {aba === 'dados' && <section className="perfil-secao" aria-labelledby="perfil-cadastro-titulo">
        <h2 id="perfil-cadastro-titulo">Dados do aluno</h2>
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
      </section>}

      {aba === 'registros' && matriculaSelecionada && <PerfilHistorico key={matriculaSelecionada.id} aluno={aluno} matricula={matriculaSelecionada} />}
      {aba === 'feedbacks' && matriculaSelecionada && <FeedbacksArea key={matriculaSelecionada.id} itens={[{ aluno, matricula: matriculaSelecionada }]} />}
      {aba !== 'dados' && !matriculaSelecionada && <p>Selecione uma matrícula para consultar {aba}.</p>}
      </div>

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
