import { useCallback, useEffect, useRef } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';
import { ALUNOS_DA_TURMA } from '../../graphql/alunos';
import { AULAS } from '../../graphql/aulas';
import { fmtData } from '../../utils/datas';
import RegistroAluno from '../registros/RegistroAluno';
import '../../styles/aulas.css';

export default function AulaDetalhe() {
  const { turma } = useOutletContext();
  const { turmaId, aulaId } = useParams();
  const aulasQ = useQuery(AULAS, { variables: { turmaId, status: 'todas' } });
  const alunosQ = useQuery(ALUNOS_DA_TURMA, { variables: { turmaId, status: 'todas' } });
  const rascunhosSujos = useRef(new Set());
  const avisarAlteracaoPendente = useCallback((id, sujo) => {
    if (sujo) rascunhosSujos.current.add(id);
    else rascunhosSujos.current.delete(id);
  }, []);

  useEffect(() => {
    function antesDeSair(evento) {
      if (rascunhosSujos.current.size > 0) {
        evento.preventDefault();
        evento.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', antesDeSair);
    return () => window.removeEventListener('beforeunload', antesDeSair);
  }, []);

  function confirmarVolta(evento) {
    if (rascunhosSujos.current.size > 0 && !window.confirm('Há registros não salvos. Sair mesmo assim?')) {
      evento.preventDefault();
    }
  }

  if ((aulasQ.loading && !aulasQ.data) || (alunosQ.loading && !alunosQ.data)) {
    return <Loading texto="Carregando aula e alunos..." />;
  }
  if (aulasQ.error || alunosQ.error) {
    return <ErrorMessage erro={aulasQ.error || alunosQ.error} />;
  }

  const aula = aulasQ.data?.aulas?.find((item) => item.id === aulaId);
  if (!aula) return <p>Aula indisponível. <Link to={`/turmas/${turmaId}/aulas`}>Voltar às aulas</Link></p>;

  const alunos = (alunosQ.data?.alunosDaTurma || [])
    .map((aluno) => ({
      aluno,
      matricula: aluno.matriculas?.find((item) => (
        item.turmaId === turmaId && item.periodoLetivo === turma.periodoLetivo
      )),
    }))
    .filter((item) => item.matricula)
    .sort((itemA, itemB) => itemA.aluno.nome.localeCompare(itemB.aluno.nome));

  return (
    <section className="aulas">
      <Link to={`/turmas/${turmaId}/aulas`} onClick={confirmarVolta}>← Voltar às aulas</Link>
      <h2>Aula de {fmtData(aula.data)} {aula.status === 'arquivada' && <span className="tag">Arquivada</span>}</h2>
      <p className="aulas-topicos">{aula.topicos.length ? aula.topicos.join(' · ') : 'Sem tópicos'}</p>
      {aula.status === 'arquivada' && <p className="aulas-aviso">Aula arquivada: registros existentes podem ser consultados, mas não alterados enquanto estiver arquivada.</p>}
      {alunos.length === 0 && <p>Nenhum aluno matriculado neste período da turma.</p>}
      {alunos.map(({ aluno, matricula }) => (
        <RegistroAluno key={matricula.id} aula={aula} aluno={aluno} matricula={matricula} onDirty={avisarAlteracaoPendente} />
      ))}
    </section>
  );
}