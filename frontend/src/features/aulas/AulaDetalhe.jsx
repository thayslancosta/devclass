import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';
import { ALUNOS_DA_TURMA } from '../../graphql/alunos';
import { AULAS } from '../../graphql/aulas';
import AulaEdicaoForm from './AulaEdicaoForm';
import '../../styles/aulas.css';

export default function AulaDetalhe() {
  const { turma } = useOutletContext();
  const { turmaId, aulaId } = useParams();
  const aulasQ = useQuery(AULAS, { variables: { turmaId, status: 'todas' }, skip: !aulaId, fetchPolicy: 'cache-and-network' });
  const alunosQ = useQuery(ALUNOS_DA_TURMA, { variables: { turmaId, status: 'todas' }, fetchPolicy: 'cache-and-network' });
  if ((aulaId && aulasQ.loading && !aulasQ.data) || (alunosQ.loading && !alunosQ.data)) return <Loading texto="Carregando aula e alunos..." />;
  const erro = aulasQ.error || alunosQ.error;
  const aviso = erro && <><ErrorMessage erro={erro} /><Button onClick={() => Promise.allSettled([...(aulaId ? [aulasQ.refetch()] : []), alunosQ.refetch()])}>Tentar novamente</Button></>;
  if ((aulasQ.error && !aulasQ.data) || (alunosQ.error && !alunosQ.data)) return aviso;
  const aula = aulaId ? aulasQ.data?.aulas?.find((a) => a.id === aulaId) : null;
  if (aulaId && !aula) return <p>Aula indisponível. <Link to={`/turmas/${turmaId}/aulas`}>Voltar às aulas</Link></p>;
  if (!aula && turma.status !== 'ativa') return <p>Turma encerrada: criação indisponível. <Link to={`/turmas/${turmaId}/aulas`}>Consultar histórico</Link></p>;
  const itens = (alunosQ.data?.alunosDaTurma || []).map((aluno) => ({
    aluno, matricula: aluno.matriculas.find((m) => m.turmaId === turmaId && m.periodoLetivo === turma.periodoLetivo),
  })).filter(({ aluno, matricula }) => matricula && (aula || (matricula.status === 'ativa' && aluno.status === 'ativo')))
    .sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome));
  return <>{aviso}<AulaEdicaoForm key={`${turmaId}:${aulaId || 'nova'}`} turma={turma} aula={aula} itens={itens} consultaIndisponivel={Boolean(erro)} /></>;
}
