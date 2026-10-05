import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import Field from '../../components/common/Field';
import Loading from '../../components/common/Loading';
import { AULAS, ARQUIVAR_AULA, ATUALIZAR_AULA, CRIAR_AULA, RESTAURAR_AULA } from '../../graphql/aulas';
import { fmtData, infoErro } from '../../utils/datas';
import '../../styles/aulas.css';

function AulaForm({ turmaId, aula, onCancel, onDone }) {
  const [data, setData] = useState(aula?.data?.slice(0, 10) || '');
  const [topicos, setTopicos] = useState((aula?.topicos || []).join('\n'));
  const [erro, setErro] = useState('');
  const [criar, criacao] = useMutation(CRIAR_AULA);
  const [atualizar, atualizacao] = useMutation(ATUALIZAR_AULA);
  const busy = criacao.loading || atualizacao.loading;

  async function salvar(evento) {
    evento.preventDefault();
    if (busy) return;
    const listaTopicos = topicos.split('\n').map((topico) => topico.trim()).filter(Boolean);
    setErro('');
    try {
      if (aula) {
        await atualizar({ variables: { id: aula.id, input: { data, topicos: listaTopicos } } });
      } else {
        await criar({ variables: { input: { turmaId, data, topicos: listaTopicos } } });
      }
      await onDone();
    } catch (falha) {
      const { code, msg } = infoErro(falha);
      setErro(code === 'CONFLICT' ? 'Já existe uma aula ativa nesta turma para essa data.' : msg);
    }
  }

  return (
    <form className="aulas-form" onSubmit={salvar}>
      <Field id="aula-data" label="Data da aula" as="input" type="date" value={data} onChange={(evento) => setData(evento.target.value)} required />
      <Field id="aula-topicos" label="Tópicos (um por linha, opcional)" as="textarea" rows={4} value={topicos} onChange={(evento) => setTopicos(evento.target.value)} />
      {erro && <ErrorMessage texto={erro} />}
      <div className="aulas-acoes">
        <Button type="submit" busy={busy}>Salvar aula</Button>
        <Button variant="secundario" onClick={onCancel} disabled={busy}>Cancelar</Button>
      </div>
    </form>
  );
}

export default function AulasTab() {
  const { turma } = useOutletContext();
  const { turmaId } = useParams();
  const [status, setStatus] = useState('ativa');
  const [form, setForm] = useState(null);
  const [erroAcao, setErroAcao] = useState('');
  const { data, loading, error, refetch } = useQuery(AULAS, { variables: { turmaId, status } });
  const [arquivar] = useMutation(ARQUIVAR_AULA);
  const [restaurar] = useMutation(RESTAURAR_AULA);

  async function mudarSituacao(aula, arquivando) {
    if (arquivando && !window.confirm('Arquivar esta aula? Os registros serão preservados.')) return;
    setErroAcao('');
    try {
      await (arquivando ? arquivar : restaurar)({ variables: { id: aula.id } });
      await refetch();
    } catch (falha) {
      setErroAcao(infoErro(falha).msg);
    }
  }

  const aulas = [...(data?.aulas || [])].sort((aulaA, aulaB) => aulaB.data.localeCompare(aulaA.data));

  return (
    <section className="aulas">
      <header className="aulas-topo">
        <h2>Aulas de {turma.nome}</h2>
        <Field id="aulas-filtro" label="Situação" as="select" value={status} onChange={(evento) => setStatus(evento.target.value)}>
          <option value="ativa">Ativas</option>
          <option value="arquivada">Arquivadas</option>
          <option value="todas">Todas</option>
        </Field>
        {turma.status === 'ativa' && <Button onClick={() => setForm('nova')}>Nova aula</Button>}
      </header>

      {form && <AulaForm turmaId={turmaId} aula={form === 'nova' ? null : form} onCancel={() => setForm(null)} onDone={async () => { setForm(null); await refetch(); }} />}
      {erroAcao && <ErrorMessage texto={erroAcao} />}
      {loading && !data && <Loading texto="Carregando aulas..." />}
      {error && <ErrorMessage erro={error} />}
      {!loading && !error && aulas.length === 0 && <p>Nenhuma aula encontrada para este filtro.</p>}

      <ul className="aulas-lista">
        {aulas.map((aula) => (
          <li key={aula.id}>
            <div className="aulas-lista__principal">
              <strong>{fmtData(aula.data)}</strong>{' '}
              <span className={`tag tag-${aula.status}`}>{aula.status === 'ativa' ? 'Ativa' : 'Arquivada'}</span>
              <p className="aulas-topicos">{aula.topicos.length ? aula.topicos.join(' · ') : 'Sem tópicos'}</p>
            </div>
            <div className="aulas-acoes">
              <Link className="botao botao--secundario" to={`/turmas/${turmaId}/aulas/${aula.id}`}>Abrir registros</Link>
              <Button variant="secundario" onClick={() => setForm(aula)}>Editar</Button>
              {aula.status === 'ativa'
                ? <Button variant="perigo" onClick={() => mudarSituacao(aula, true)}>Arquivar</Button>
                : <Button variant="secundario" onClick={() => mudarSituacao(aula, false)} disabled={turma.status !== 'ativa'}>Restaurar</Button>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}