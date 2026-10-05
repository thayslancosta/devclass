import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { ADICIONAR_REGISTRO, ARQUIVAR_REGISTRO, REGISTROS, RESTAURAR_REGISTRO, ATUALIZAR_REGISTRO } from '../../graphql/registros';
import { DESEMPENHOS, HABILIDADES, infoErro } from '../../utils/datas';
import MensagemDiaria from './MensagemDiaria';

const novaAvaliacao = () => ({ habilidade: 'speaking', desempenho: 'adequado', observacao: '', outraDescricao: '' });

function FormRegistro({ aula, matricula, registro, onDirty, onSaved }) {
  const [observacao, setObservacao] = useState(registro?.observacaoGeral || '');
  const [avaliacoes, setAvaliacoes] = useState(() => (registro?.avaliacoes || []).map((avaliacao) => ({
    habilidade: avaliacao.habilidade,
    desempenho: avaliacao.desempenho,
    observacao: avaliacao.observacao || '',
    outraDescricao: avaliacao.outraDescricao || '',
  })));
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [adicionar, criacao] = useMutation(ADICIONAR_REGISTRO);
  const [atualizar, atualizacao] = useMutation(ATUALIZAR_REGISTRO);
  const busy = criacao.loading || atualizacao.loading;

  function marcarAlteracao(acao) {
    return (...argumentos) => {
      acao(...argumentos);
      setSucesso('');
      onDirty(matricula.id, true);
    };
  }

  function alterarAvaliacao(indice, campo, valor) {
    setAvaliacoes((lista) => lista.map((avaliacao, atual) => (
      atual === indice ? { ...avaliacao, [campo]: valor } : avaliacao
    )));
  }

  async function salvar(evento) {
    evento.preventDefault();
    if (busy) return;
    if (avaliacoes.some((avaliacao) => avaliacao.habilidade === 'outra' && !avaliacao.outraDescricao.trim())) {
      setErro('Descreva a habilidade selecionada como “Outra habilidade”.');
      return;
    }
    if (!observacao.trim() && avaliacoes.length === 0) {
      setErro('Informe uma observação ou ao menos uma avaliação.');
      return;
    }

    const listaAvaliacoes = avaliacoes.map((avaliacao) => {
      const item = { habilidade: avaliacao.habilidade, desempenho: avaliacao.desempenho };
      if (avaliacao.observacao.trim()) item.observacao = avaliacao.observacao.trim();
      if (avaliacao.habilidade === 'outra') item.outraDescricao = avaliacao.outraDescricao.trim();
      return item;
    });

    setErro('');
    try {
      if (registro) {
        await atualizar({ variables: { id: registro.id, input: { observacaoGeral: observacao.trim() || null, avaliacoes: listaAvaliacoes } } });
      } else {
        await adicionar({ variables: { input: {
          aulaId: aula.id,
          matriculaId: matricula.id,
          observacaoGeral: observacao.trim() || undefined,
          avaliacoes: listaAvaliacoes,
        } } });
      }
      onDirty(matricula.id, false);
      setSucesso('Registro salvo.');
      await onSaved();
    } catch (falha) {
      const { code, msg } = infoErro(falha);
      setErro(code === 'CONFLICT' ? `${msg} Atualize os dados antes de tentar novamente.` : msg);
      if (code === 'CONFLICT') await onSaved();
    }
  }

  return (
    <form className="aulas-form" onSubmit={salvar}>
      <label htmlFor={`observacao-${matricula.id}`}>Observação geral
        <textarea id={`observacao-${matricula.id}`} rows={3} value={observacao} onChange={(evento) => marcarAlteracao(setObservacao)(evento.target.value)} />
      </label>
      {avaliacoes.map((avaliacao, indice) => (
        <fieldset className="avaliacao" key={`${matricula.id}-${indice}`}>
          <label>Habilidade
            <select value={avaliacao.habilidade} onChange={(evento) => marcarAlteracao(() => alterarAvaliacao(indice, 'habilidade', evento.target.value))()}>
              {HABILIDADES.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </select>
          </label>
          <label>Desempenho
            <select value={avaliacao.desempenho} onChange={(evento) => marcarAlteracao(() => alterarAvaliacao(indice, 'desempenho', evento.target.value))()}>
              {DESEMPENHOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </select>
          </label>
          {avaliacao.habilidade === 'outra' && (
            <label>Qual habilidade?
              <input value={avaliacao.outraDescricao} onChange={(evento) => marcarAlteracao(() => alterarAvaliacao(indice, 'outraDescricao', evento.target.value))()} />
            </label>
          )}
          <label>Observação da avaliação
            <input value={avaliacao.observacao} onChange={(evento) => marcarAlteracao(() => alterarAvaliacao(indice, 'observacao', evento.target.value))()} />
          </label>
          <Button type="button" variant="secundario" onClick={marcarAlteracao(() => setAvaliacoes((lista) => lista.filter((_, atual) => atual !== indice)))}>Remover avaliação</Button>
        </fieldset>
      ))}
      <div className="aulas-acoes">
        <Button type="button" variant="secundario" onClick={marcarAlteracao(() => setAvaliacoes((lista) => [...lista, novaAvaliacao()]))}>Adicionar habilidade</Button>
        <Button type="submit" busy={busy}>Salvar registro</Button>
      </div>
      {erro && <ErrorMessage texto={erro} />}
      {sucesso && <p className="aulas-ok" role="status">{sucesso}</p>}
    </form>
  );
}

export default function RegistroAluno({ aula, aluno, matricula, onDirty }) {
  const [aberto, setAberto] = useState(false);
  const [erroAcao, setErroAcao] = useState('');
  const { data, loading, error, refetch } = useQuery(REGISTROS, {
    variables: { matriculaId: matricula.id, status: 'todos' },
  });
  const [arquivar] = useMutation(ARQUIVAR_REGISTRO);
  const [restaurar] = useMutation(RESTAURAR_REGISTRO);
  const registrosDaAula = (data?.registros || []).filter((registro) => registro.aulaId === aula.id);
  const ativo = registrosDaAula.find((registro) => registro.status === 'ativo') || null;
  const arquivados = registrosDaAula.filter((registro) => registro.status === 'arquivado');
  const situacao = ativo ? 'Registrado' : arquivados.length ? 'Arquivado' : 'Sem registro';
  const bloqueado = matricula.status !== 'ativa' || aluno.status !== 'ativo' || aula.status !== 'ativa';

  async function mudarSituacao(registro, arquivando) {
    if (arquivando && !window.confirm('Arquivar este registro?')) return;
    setErroAcao('');
    try {
      await (arquivando ? arquivar : restaurar)({ variables: { id: registro.id } });
      await refetch();
    } catch (falha) {
      setErroAcao(infoErro(falha).msg);
    }
  }

  return (
    <article className="registro-aluno">
      <button className="registro-cab" type="button" aria-expanded={aberto} onClick={() => setAberto((valor) => !valor)}>
        <span>{aluno.nome}{matricula.status === 'encerrada' ? ' (matrícula encerrada)' : ''}{aluno.status === 'inativo' ? ' (inativo)' : ''}</span>
        <span className="tag">{loading && !data ? 'Carregando' : situacao}</span>
      </button>
      <div hidden={!aberto} className="registro-corpo">
        {loading && !data && <p>Carregando registro...</p>}
        {error && <ErrorMessage erro={error} />}
        {erroAcao && <ErrorMessage texto={erroAcao} />}
        {data && !error && (
          <>
            {bloqueado && <p className="aulas-aviso">Turma, aula, matrícula ou cadastro inativo: operações de escrita podem ser recusadas pelo servidor.</p>}
            {bloqueado
              ? <div className="historico-registro">
                {ativo && <p>{ativo.observacaoGeral || 'Registro sem observação geral.'}</p>}
                {ativo && <MensagemDiaria registro={ativo} onChanged={refetch} somenteLeitura />}
                {!ativo && <p>Não há registro ativo nesta aula.</p>}
              </div>
              : <FormRegistro key={ativo?.id || `novo-${matricula.id}-${aula.id}`} aula={aula} matricula={matricula} registro={ativo} onDirty={onDirty} onSaved={refetch} />}
            {ativo && <Button variant="perigo" onClick={() => mudarSituacao(ativo, true)}>Arquivar registro</Button>}
            {arquivados.map((registro) => (
              <div key={registro.id} className="aulas-aviso">
                <p>Registro arquivado: {registro.observacaoGeral || `${registro.avaliacoes.length} avaliação(ões)`}</p>
                {!ativo && !bloqueado && <Button variant="secundario" onClick={() => mudarSituacao(registro, false)}>Restaurar</Button>}
              </div>
            ))}
          </>
        )}
      </div>
    </article>
  );
}