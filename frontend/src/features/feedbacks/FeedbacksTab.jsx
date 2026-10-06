import { Link, useOutletContext } from 'react-router-dom';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';
import { useAlunosDaTurma } from '../alunos/useAlunosDaTurma';
import FeedbacksArea from './FeedbacksArea';

export default function FeedbacksTab() {
  const { turma } = useOutletContext();
  // Histórico inclui matrículas encerradas e cadastros inativos.
  const { itens, loading, error, refetch } = useAlunosDaTurma(turma.id, 'todas');
  return <section>
    <h2>Feedbacks da turma</h2>
    {loading && <Loading texto="Carregando matrículas..." />}
    {error && <><ErrorMessage erro={error} /><Button onClick={() => refetch().catch(() => {})}>Tentar consulta novamente</Button></>}
    {!loading && !error && itens.length === 0 && <EmptyState titulo="Nenhum aluno matriculado" descricao="As matrículas desta turma aparecerão aqui, inclusive as encerradas."
      acao={<Link to={`/turmas/${turma.id}/alunos`}>Abrir alunos da turma</Link>} />}
    {itens.length > 0 && <FeedbacksArea key={turma.id} itens={itens.filter(({ matricula }) => matricula)} />}
  </section>;
}
