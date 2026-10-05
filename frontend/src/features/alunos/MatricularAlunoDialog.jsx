import { useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Field from '../../components/common/Field';
import Loading from '../../components/common/Loading';
import { MATRICULAR_ALUNO, MEUS_ALUNOS } from '../../graphql/alunos';
import AlunoForm from './AlunoForm';
import ErroDeConsulta from './ErroDeConsulta';
import { matriculaNoPeriodo, mensagemDeErro, normalizarTexto } from './alunosUtils';
import { atualizarConsultasDeAlunos } from './atualizarConsultas';
import './alunos.css';

// Matricula um cadastro EXISTENTE na turma. Só aparecem alunos ativos sem
// nenhuma matrícula no semestre da turma; o período vem sempre da turma.
export default function MatricularAlunoDialog({ turma, onFechar, onMatriculado }) {
  const client = useApolloClient();
  const { data, loading, error, refetch } = useQuery(MEUS_ALUNOS, {
    variables: { status: 'todos' },
    fetchPolicy: 'cache-and-network',
  });
  const [matricularAluno] = useMutation(MATRICULAR_ALUNO);
  const [busca, setBusca] = useState('');
  const [alunoId, setAlunoId] = useState('');
  const [criando, setCriando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState(null);
  const [aviso, setAviso] = useState('');

  const periodo = turma.periodoLetivo;
  const alunos = data?.meusAlunos;
  const termo = normalizarTexto(busca);

  const { elegiveis, indisponiveis } = useMemo(() => {
    const grupos = { elegiveis: [], indisponiveis: [] };
    (alunos || []).forEach((aluno) => {
      const matricula = matriculaNoPeriodo(aluno, periodo);
      if (aluno.status === 'ativo' && !matricula) {
        grupos.elegiveis.push(aluno);
      } else {
        grupos.indisponiveis.push({
          aluno,
          motivo: matricula
            ? 'já tem matrícula em ' + periodo + ' (' + (matricula.turma?.nome || 'outra turma')
              + ', ' + (matricula.status === 'ativa' ? 'ativa' : 'encerrada') + ')'
            : 'cadastro inativo',
        });
      }
    });
    return grupos;
  }, [alunos, periodo]);

  const visiveis = elegiveis.filter((aluno) => !termo || normalizarTexto(aluno.nome).includes(termo));
  // Só aparecem durante a busca, para evitar um cadastro duplicado de quem já existe.
  const indisponiveisNaBusca = termo
    ? indisponiveis.filter(({ aluno }) => normalizarTexto(aluno.nome).includes(termo))
    : [];
  const selecionado = elegiveis.find((aluno) => aluno.id === alunoId) || null;

  async function matricular(evento) {
    evento.preventDefault();
    if (!selecionado || enviando) return;
    setFalha(null);
    setAviso('');
    setEnviando(true);
    try {
      const resposta = await matricularAluno({
        variables: { alunoId: selecionado.id, turmaId: turma.id },
      });
      await atualizarConsultasDeAlunos(client);
      onMatriculado(selecionado, resposta.data.matricularAluno);
    } catch (erro) {
      setFalha({ erro, nome: selecionado.nome });
      // Conflito ou lista desatualizada: consulta o estado atual dos cadastros.
      atualizarConsultasDeAlunos(client);
    } finally {
      setEnviando(false);
    }
  }

  if (criando) {
    return (
      <AlunoForm
        nomeInicial={busca.trim()}
        onCancelar={() => setCriando(false)}
        onSalvo={(novo) => {
          setCriando(false);
          setBusca('');
          setFalha(null);
          setAlunoId(novo.id);
          setAviso('Cadastro criado: ' + novo.nome + '. Confirme a matrícula abaixo.');
        }}
      />
    );
  }

  return (
    <div className="aluno-modal-overlay">
      <section
        className="aluno-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-matricular"
      >
        <h2 id="titulo-matricular">Matricular aluno</h2>
        <p className="alunos-secundario">
          {turma.nome} · semestre {periodo}. Aparecem apenas cadastros ativos sem matrícula em{' '}
          {periodo}: cada aluno tem no máximo uma matrícula por semestre, mesmo que ela seja encerrada.
        </p>

        <form onSubmit={matricular} noValidate>
          {aviso && <p className="alunos-sucesso" role="status">{aviso}</p>}
          {falha && (
            <ErrorMessage
              texto={'Não foi possível matricular ' + falha.nome + ': ' + mensagemDeErro(falha.erro)}
            />
          )}

          {loading && !alunos && <Loading texto="Carregando seus alunos..." />}
          {error && <ErroDeConsulta erro={error} onTentarNovamente={() => refetch()} />}

          {alunos && (
            <>
              <Field
                id="matricular-busca"
                label="Buscar aluno pelo nome"
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Parte do nome"
                autoFocus
              />

              {elegiveis.length === 0 ? (
                <EmptyState
                  titulo="Nenhum aluno disponível para esta turma"
                  descricao={alunos.length === 0
                    ? 'Você ainda não tem alunos cadastrados.'
                    : 'Todos os seus cadastros ativos já têm matrícula em ' + periodo + '.'}
                />
              ) : (
                <fieldset className="matricular-lista">
                  <legend>Alunos disponíveis ({visiveis.length})</legend>
                  {visiveis.length === 0 && (
                    <p className="alunos-secundario">Nenhum aluno disponível com esse nome.</p>
                  )}
                  {visiveis.map((aluno) => (
                    <label className="matricular-opcao" key={aluno.id}>
                      <input
                        type="radio"
                        name="matricular-aluno"
                        value={aluno.id}
                        checked={aluno.id === alunoId}
                        onChange={() => setAlunoId(aluno.id)}
                      />
                      <span>
                        <span className="matricular-opcao__nome">{aluno.nome}</span>
                        <span className="alunos-secundario">
                          {aluno.nomeResponsavel
                            ? 'Responsável: ' + aluno.nomeResponsavel
                            : 'Sem responsável informado'}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}

              {indisponiveisNaBusca.length > 0 && (
                <div className="matricular-indisponiveis">
                  <p className="alunos-secundario">Já cadastrados, mas indisponíveis para esta turma:</p>
                  <ul>
                    {indisponiveisNaBusca.map(({ aluno, motivo }) => (
                      <li key={aluno.id}>{aluno.nome} — {motivo}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="matricular-novo">
                <p className="alunos-secundario">
                  Não encontrou? Confira a busca antes de cadastrar, para não duplicar um aluno.
                </p>
                <Button variant="secundario" onClick={() => setCriando(true)} disabled={enviando}>
                  Cadastrar novo aluno
                </Button>
              </div>
            </>
          )}

          <p className="matricular-selecao" role="status">
            {selecionado ? 'Selecionado: ' + selecionado.nome : 'Nenhum aluno selecionado.'}
          </p>
          <div className="aluno-form__acoes">
            <Button variant="secundario" onClick={onFechar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" busy={enviando} disabled={!selecionado || enviando}>
              Matricular na turma
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
