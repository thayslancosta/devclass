import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import Field from '../../components/common/Field';
import Loading from '../../components/common/Loading';
import { AULAS, ARQUIVAR_AULA, RESTAURAR_AULA } from '../../graphql/aulas';
import { fmtData, infoErro } from '../../utils/datas';
import '../../styles/aulas.css';

export default function AulasTab() {
  const { turma } = useOutletContext();
  const { turmaId } = useParams();
  const [status, setStatus] = useState('ativa');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const variaveis = {
    turmaId,
    status,
    ...(dataInicio ? { dataInicio } : {}),
    ...(dataFim ? { dataFim } : {}),
  };
  const { data, loading, error, refetch } = useQuery(AULAS, { variables: variaveis, fetchPolicy: 'cache-and-network' });
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
        <Field
          id="aulas-data-inicio"
          label="De"
          type="date"
          value={dataInicio}
          onChange={(evento) => setDataInicio(evento.target.value)}
        />
        <Field
          id="aulas-data-fim"
          label="Até"
          type="date"
          value={dataFim}
          onChange={(evento) => setDataFim(evento.target.value)}
        />
        <Button variant="secundario" onClick={() => { setDataInicio(''); setDataFim(''); }} disabled={!dataInicio && !dataFim}>
          Limpar período
        </Button>
        {turma.status === 'ativa' ? <Link className="botao botao--primario" to={`/turmas/${turmaId}/aulas/nova`}>Nova aula</Link> : <p>Turma encerrada: apenas histórico disponível.</p>}
      </header>

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
              <Link className="botao botao--secundario" to={`/turmas/${turmaId}/aulas/${aula.id}`}>Abrir aula</Link>
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
