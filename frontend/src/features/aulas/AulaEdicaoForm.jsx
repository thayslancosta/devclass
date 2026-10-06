import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApolloClient } from '@apollo/client/react';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import ErrorMessage from '../../components/common/ErrorMessage';
import RegistroAluno from '../registros/RegistroAluno';
import useEdicaoPendente from '../../hooks/useEdicaoPendente';
import { AULAS, CRIAR_AULA, ATUALIZAR_AULA } from '../../graphql/aulas';
import { REGISTROS, ADICIONAR_REGISTRO, ATUALIZAR_REGISTRO, ARQUIVAR_REGISTRO, RESTAURAR_REGISTRO } from '../../graphql/registros';
import { infoErro, fmtData } from '../../utils/datas';
import { criarEdicao, consultarLinha, salvarEdicao, abrirAulaEncontrada, resolverRegistro, edicaoPendente, linhaAlterada } from './aulaEdicao';

export default function AulaEdicaoForm({ turma, aula, itens, consultaIndisponivel = false }) {
  const client = useApolloClient();
  const [, render] = useReducer((v) => v + 1, 0);
  const referencia = useRef(null);
  if (!referencia.current) referencia.current = criarEdicao(turma, aula, itens);
  const s = referencia.current;
  // Reconciliar contexto/status sem reinicializar texto, IDs ou versões salvas.
  s.turma = turma;
  if (aula && s.aula && aula.id === s.aula.id) s.aula = { ...s.aula, status: aula.status };
  for (const item of itens) {
    const linha = s.linhas[item.matricula.id];
    if (linha) { linha.aluno = item.aluno; linha.matricula = item.matricula; }
    else Object.assign(s.linhas, criarEdicao(turma, s.aula, [item]).linhas);
  }
  const idsContexto = Object.keys(s.linhas).join('|');
  const montado = useRef(false);
  const mensagens = useRef({});
  const avisar = useCallback(() => { if (montado.current) render(); }, []);
  const api = useMemo(() => {
    async function mutation(documento, variables, campo) {
      const { data } = await client.mutate({ mutation: documento, variables }); return data[campo];
    }
    return {
      aulas: async () => (await client.query({ query: AULAS, variables: { turmaId: turma.id, status: 'todas' }, fetchPolicy: 'network-only' })).data.aulas,
      registros: async (matriculaId) => (await client.query({ query: REGISTROS, variables: { matriculaId, status: 'todos' }, fetchPolicy: 'network-only' })).data.registros,
      criarAula: (input) => mutation(CRIAR_AULA, { input }, 'criarAula'),
      atualizarAula: (id, input) => mutation(ATUALIZAR_AULA, { id, input }, 'atualizarAula'),
      adicionarRegistro: (input) => mutation(ADICIONAR_REGISTRO, { input }, 'adicionarRegistro'),
      atualizarRegistro: (id, input) => mutation(ATUALIZAR_REGISTRO, { id, input }, 'atualizarRegistro'),
      situacao: (id, arquivar) => mutation(arquivar ? ARQUIVAR_REGISTRO : RESTAURAR_REGISTRO, { id }, arquivar ? 'arquivarRegistro' : 'restaurarRegistro'),
    };
  }, [client, turma.id]);
  useEffect(() => {
    montado.current = true;
    let ativo = true;
    async function carregar() {
      if (!s.aula) return;
      // Consultas independentes, limitadas a quatro matrículas por vez.
      const ids = Object.keys(s.linhas).filter((id) => !s.linhas[id].conhecido);
      for (let i = 0; i < ids.length && ativo; i += 4) {
        await Promise.all(ids.slice(i, i + 4).map((id) => consultarLinha(s, id, api)));
        if (ativo) avisar();
      }
    }
    carregar();
    return () => { ativo = false; montado.current = false; };
  }, [s, api, avisar, idsContexto]);
  const mensagemPendente = Object.values(mensagens.current).some((m) => m.sujo);
  const mensagemOcupada = Object.values(mensagens.current).some((m) => m.busy);
  const onMensagemPendente = useCallback((id, sujo, busy) => {
    mensagens.current[id] = { sujo, busy }; avisar();
  }, [avisar]);
  useEdicaoPendente(edicaoPendente(s) || mensagemPendente, s.ocupado || mensagemOcupada, 'alterações da aula');
  async function salvar() {
    if (s.ocupado || mensagemOcupada || consultaIndisponivel) return;
    await salvarEdicao(s, api, avisar, () => montado.current);
    // Atualiza telas já abertas sem reinicializar os rascunhos deste formulário.
    if (s.aula) client.refetchQueries({ include: ['Aulas', 'Registros'] }).catch(() => {});
  }
  async function situacao(l, registro, arquivar) {
    if (s.ocupado || mensagemOcupada || linhaAlterada(l) || mensagens.current[registro.id]?.sujo) return;
    if (arquivar && !window.confirm('Arquivar este registro? Ele continuará no histórico.')) return;
    s.ocupado = true; l.erro = ''; avisar();
    try {
      await api.situacao(registro.id, arquivar);
      await consultarLinha(s, l.matricula.id, api);
    } catch (erro) {
      l.erro = infoErro(erro).msg;
      await consultarLinha(s, l.matricula.id, api);
    } finally { s.ocupado = false; avisar(); }
  }
  const linhas = Object.values(s.linhas);
  const operacionais = linhas.filter((l) => l.matricula.status === 'ativa' && l.aluno.status === 'ativo');
  const historicas = linhas.filter((l) => !operacionais.includes(l));
  const falhas = s.erro || linhas.some((l) => l.erro || l.erroConsulta || l.conflito || l.incerto);
  const bloqueado = s.ocupado || mensagemOcupada || consultaIndisponivel;
  function linha(l) {
    const mensagemSuja = Boolean(mensagens.current[l.registro?.id]?.sujo);
    return <RegistroAluno key={l.matricula.id} edicao={s} linha={l} bloqueado={bloqueado} mensagemPendente={mensagemSuja}
      onChange={(valor) => { l.rascunho = valor; l.erro = ''; s.info = ''; avisar(); }}
      onConsultar={async () => { await consultarLinha(s, l.matricula.id, api); avisar(); }}
      onResolver={(local) => { resolverRegistro(l, local); avisar(); }} onSituacao={(r, arquivar) => situacao(l, r, arquivar)}
      onMensagemPendente={onMensagemPendente} onMensagemSalva={async (registro) => { if (registro?.id === l.registro?.id) l.registro = registro; avisar(); }} />;
  }
  return <section className="aulas aula-edicao">
    <Link to={`/turmas/${turma.id}/aulas`}>← Voltar às aulas</Link>
    <h2>{s.aula ? `Editar aula — ${fmtData(s.aula.data)}` : `Nova aula — ${turma.nome}`}</h2>
    <p className="aulas-topicos">{turma.nome} · Semestre {turma.periodoLetivo}{s.aula?.status === 'arquivada' ? ' · Aula arquivada' : ''}</p>
    <div className="aulas-form aula-metadados">
      <Field id="aula-data" label="Data da aula" type="date" value={s.data} disabled={bloqueado || Boolean(s.incertoAula)} onChange={(e) => {
        if (Object.values(s.linhas).some(linhaAlterada) && !window.confirm('Alterar a data mantendo as observações digitadas nesta aula?')) return;
        s.data = e.target.value; s.conflitoAula = null; s.erro = ''; avisar();
      }} />
      <details><summary>Tópicos da aula — opcional</summary>
        <Field id="aula-topicos" label="Tópicos (um por linha)" as="textarea" rows={3} value={s.topicos} disabled={bloqueado || Boolean(s.incertoAula)}
          onChange={(e) => { s.topicos = e.target.value; s.erro = ''; avisar(); }} />
      </details>
    </div>
    {s.erro && <ErrorMessage texto={s.erro} />}
    {s.conflitoAula && <div className="aulas-aviso">
      <p>Aula encontrada em {fmtData(s.conflitoAula.data)} · {s.conflitoAula.topicos.join(' · ') || 'Sem tópicos'}.</p>
      {s.aula && s.conflitoAula.id !== s.aula.id ? <p>A data pertence a outra aula. Escolha uma data livre para manter os registros na aula original. <Link to={`/turmas/${turma.id}/aulas/${s.conflitoAula.id}`}>Abrir aula existente</Link></p>
        : <Button disabled={bloqueado} onClick={() => abrirAulaEncontrada(s, s.conflitoAula, api, avisar)}>Abrir aula existente</Button>}
      {s.aula && s.conflitoAula.id === s.aula.id && <p>Ao abrir, os metadados salvos serão usados e seus rascunhos por aluno continuarão disponíveis.</p>}
    </div>}
    {!!operacionais.length && <p>Preencha apenas os alunos com observações nesta aula. Avaliações por habilidade são opcionais.</p>}
    {operacionais.map(linha)}
    {!!historicas.length && <details className="aulas-historico"><summary>Alunos com matrícula encerrada ou cadastro inativo ({historicas.length})</summary>{historicas.map(linha)}</details>}
    {!linhas.length && <p>Nenhum aluno elegível. A aula pode ser salva sem observações.</p>}
    <div className="aulas-acoes aula-salvar">
      <Button busy={bloqueado} onClick={salvar}>{s.aula && falhas ? 'Tentar salvar pendentes' : 'Salvar aula e registros'}</Button>
      <Link className="botao botao--secundario" to={`/turmas/${turma.id}/aulas`}>Cancelar / voltar</Link>
      {s.aula && <Link to={`/turmas/${turma.id}/aulas/${s.aula.id}`}>Abrir link da aula salva</Link>}
    </div>
    {s.info && <p role="status">{s.info}</p>}
    {s.aula && <p className="aulas-topicos">Você está editando a mesma aula salva. Alterar a data não cria outra aula.</p>}
  </section>;
}
