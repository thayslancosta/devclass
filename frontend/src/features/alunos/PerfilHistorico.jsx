import { useQuery } from '@apollo/client/react';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';
import { AULAS } from '../../graphql/aulas';
import { REGISTROS } from '../../graphql/registros';
import { fmtData } from '../../utils/datas';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { HABILIDADES, DESEMPENHOS } from '../../utils/datas';

function dataComoChave(data) {
  return String(data || '').slice(0, 10);
}

export default function PerfilHistorico({ aluno, matricula }) {
  const registrosQ = useQuery(REGISTROS, {
    variables: { matriculaId: matricula.id, status: 'todos' }, fetchPolicy: 'cache-and-network',
  });
  const aulasQ = useQuery(AULAS, {
    variables: { turmaId: matricula.turmaId, status: 'todas' }, fetchPolicy: 'cache-and-network',
  });
  const erro = registrosQ.error || aulasQ.error;
  const carregando = (registrosQ.loading && !registrosQ.data) || (aulasQ.loading && !aulasQ.data);

  const aulasPorId = new Map((aulasQ.data?.aulas || []).map((aula) => [aula.id, {
    ...aula,
    dataChave: dataComoChave(aula.data),
  }]));
  const historico = (registrosQ.data?.registros || [])
    .map((registro) => ({ ...registro, aula: aulasPorId.get(registro.aulaId) }))
    .filter((registro) => registro.aula)
    .sort((registroA, registroB) => registroB.aula.dataChave.localeCompare(registroA.aula.dataChave));

  return (
    <div className="perfil-historico" data-matricula-id={matricula.id}>
      <section className="perfil-historico__secao" aria-labelledby="perfil-registros-titulo">
        <h3 id="perfil-registros-titulo">Registros das aulas</h3>
        {carregando && <Loading texto="Carregando histórico..." />}
        {erro && <><ErrorMessage erro={erro} /><Button onClick={() => Promise.allSettled([registrosQ.refetch(), aulasQ.refetch()])}>Tentar novamente</Button></>}
        {!carregando && !erro && historico.length === 0 && (
          <EmptyState titulo="Nenhum registro nesta matrícula" descricao={`${aluno.nome} ainda não tem registros nas aulas deste semestre.`} />
        )}
        {!erro && historico.map((registro) => (
          <article className="historico-registro" key={registro.id}>
            <h4>{fmtData(registro.aula.dataChave)} <span className="tag">{registro.status === 'ativo' ? 'Ativo' : 'Arquivado'}</span></h4>
            <p className="aulas-topicos">{registro.aula.topicos.length ? registro.aula.topicos.join(' · ') : 'Aula sem tópicos'}</p>
            {registro.observacaoGeral && (registro.observacaoGeral.length > 400 ? <>
              <p>{registro.observacaoGeral.slice(0, 250)}…</p><details><summary>Ler observação completa</summary><p>{registro.observacaoGeral}</p></details>
            </> : <p>{registro.observacaoGeral}</p>)}
            {registro.avaliacoes.map((avaliacao, indice) => (
              <p key={`${registro.id}-${indice}`}>
                <strong>{avaliacao.habilidade === 'outra' ? avaliacao.outraDescricao : (HABILIDADES.find(([v]) => v === avaliacao.habilidade)?.[1] || avaliacao.habilidade)}</strong>
                {' · '}{DESEMPENHOS.find(([v]) => v === avaliacao.desempenho)?.[1] || avaliacao.desempenho}
                {avaliacao.observacao ? ` · ${avaliacao.observacao}` : ''}
              </p>
            ))}
            {(registro.mensagemEditada || registro.mensagemIAOriginal) && (
              <details>
                <summary>Mensagem diária</summary>
                <p>{registro.mensagemEditada ?? registro.mensagemIAOriginal}</p>
                <Button variant="secundario" onClick={async (e) => {
                  try { await navigator.clipboard.writeText(registro.mensagemEditada ?? registro.mensagemIAOriginal); e.target.textContent = 'Copiado'; }
                  catch { e.target.textContent = 'Selecione o texto acima para copiar'; }
                }}>Copiar mensagem</Button>
              </details>
            )}
            <Link to={`/turmas/${matricula.turmaId}/aulas/${registro.aulaId}`}>Abrir aula para consultar ou revisar</Link>
          </article>
        ))}
      </section>


    </div>
  );
}
