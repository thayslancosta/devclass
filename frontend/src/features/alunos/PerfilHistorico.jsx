import EmptyState from '../../components/common/EmptyState';

// Ponto de integração das Fases 4 (registros) e 5 (feedbacks) no perfil do aluno.
//
// AlunoPerfilPage entrega o contexto já resolvido, sem exigir cópia de IDs:
//   aluno     -> cadastro: { id, nome, generoGramatical, responsável, status }
//   matricula -> matrícula histórica selecionada no perfil:
//                { id, alunoId, turmaId, periodoLetivo, status, turma: { id, nome } }
//
// matricula.id é o ID a usar em registros(matriculaId) e feedbacks(matriculaId).
// O componente é remontado (key) sempre que outra matrícula é selecionada.
//
// Para integrar, troque o EmptyState provisório da seção do seu domínio pelo
// seu componente, repassando { aluno, matricula }. AlunoPerfilPage não muda.
export default function PerfilHistorico({ aluno, matricula }) {
  const contexto = aluno.nome + ' em ' + (matricula.turma?.nome || 'turma indisponível')
    + ' (' + matricula.periodoLetivo + ')';

  return (
    <div className="perfil-historico" data-matricula-id={matricula.id}>
      <section className="perfil-historico__secao" aria-labelledby="perfil-registros-titulo">
        <h3 id="perfil-registros-titulo">Registros das aulas</h3>
        {/* Fase 4 (Pedro): histórico de registros desta matrícula. */}
        <EmptyState
          titulo="Registros ainda não integrados"
          descricao={'Os registros de ' + contexto + ' serão exibidos aqui na Fase 4.'}
        />
      </section>

      <section className="perfil-historico__secao" aria-labelledby="perfil-feedbacks-titulo">
        <h3 id="perfil-feedbacks-titulo">Feedbacks</h3>
        {/* Fase 5 (Thayslan): feedbacks parcial e final desta matrícula. */}
        <EmptyState
          titulo="Feedbacks ainda não integrados"
          descricao={'Os feedbacks de ' + contexto + ' serão exibidos aqui na Fase 5.'}
        />
      </section>
    </div>
  );
}
