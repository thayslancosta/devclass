import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Field from '../../components/common/Field';
import Loading from '../../components/common/Loading';
import {
  ARQUIVAR_FEEDBACK, CRIAR_FEEDBACK_MANUAL, DESMARCAR_FEEDBACK_ENVIADO,
  EDITAR_FEEDBACK, GERAR_FEEDBACKS, MARCAR_FEEDBACK_ENVIADO, RESTAURAR_FEEDBACK,
} from '../../graphql/feedbacks';
import FeedbackEditor from './FeedbackEditor';
import { chaveManual, feedbackAtivo, mensagemFeedback, visaoFeedbacks } from './feedbackUtils';
import { executarSequencia } from './sequenciaFeedbacks';
import useFeedbacks from './useFeedbacks';
import useSaidaFeedbacks from './useSaidaFeedbacks';
import './feedbacks.css';

const ACOES = {
  marcar: [MARCAR_FEEDBACK_ENVIADO, 'marcarFeedbackEnviado', 'Você já enviou este feedback ao aluno ou responsável?'],
  desmarcar: [DESMARCAR_FEEDBACK_ENVIADO, 'desmarcarFeedbackEnviado', 'Desmarcar o envio e liberar a revisão deste feedback?'],
  arquivar: [ARQUIVAR_FEEDBACK, 'arquivarFeedback', 'Arquivar este feedback? Ele continuará disponível no histórico.'],
  restaurar: [RESTAURAR_FEEDBACK, 'restaurarFeedback', 'Restaurar este feedback? Só pode existir um ativo por tipo e matrícula.'],
};

export default function FeedbacksArea({ itens }) {
  const { client, consultas, atualizar, aplicar, montado } = useFeedbacks(itens);
  const [params] = useSearchParams();
  const [tipo, setTipo] = useState(params.get('tipo') === 'final' ? 'final' : 'parcial');
  const [envio, setEnvio] = useState('todos');
  const [arquivados, setArquivados] = useState(false);
  const [selecionados, setSelecionados] = useState([]);
  const [resultados, setResultados] = useState({});
  // Apenas edições locais ficam aqui. Atualizar consultas nunca redefine este mapa.
  const [rascunhos, setRascunhos] = useState({});
  const [aberto, setAberto] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const feedbacks = Object.values(consultas).flatMap((consulta) => consulta.lista || []);
  const pendente = Object.entries(rascunhos).some(([id, texto]) =>
    id.startsWith('manual:') ? Boolean(texto) : texto !== feedbacks.find((f) => f.id === id)?.textoEditado);
  useSaidaFeedbacks(pendente, ocupado);

  const alvoUrl = feedbacks.find((f) => f.id === params.get('feedback'));
  const abriuUrl = useRef(null);
  useEffect(() => {
    if (!alvoUrl || abriuUrl.current === alvoUrl.id) return;
    abriuUrl.current = alvoUrl.id;
    setTipo(alvoUrl.tipo); setArquivados(alvoUrl.status === 'arquivado'); setEnvio('todos'); setAberto(alvoUrl.id);
  }, [alvoUrl]);

  function filtro(acao) {
    if (ocupado) return;
    acao();
    if (selecionados.length) setInfo('Seleção limpa após alterar os filtros.');
    setSelecionados([]);
  }
  function mudarTipo(valor) {
    if (valor === tipo) return;
    if (pendente && !window.confirm('Há edições pendentes. Trocar de tipo mantendo esses rascunhos nesta tela?')) return;
    filtro(() => { setTipo(valor); setResultados({}); setAberto(null); });
  }
  function editarRascunho(id, texto) {
    setRascunhos((anteriores) => {
      const proximos = { ...anteriores };
      if (texto === null) delete proximos[id];
      else proximos[id] = texto;
      return proximos;
    });
  }
  function iniciar() {
    if (trava.current) return false;
    trava.current = true;
    setOcupado(true);
    setErro('');
    setInfo('');
    return true;
  }
  function terminar() {
    trava.current = false;
    if (montado.current) setOcupado(false);
  }
  const resultado = (id, valor) => {
    if (montado.current) setResultados((atual) => ({ ...atual, [id]: valor }));
  };

  async function gerar(ids, tipoGeracao) {
    if (!ids.length || !iniciar()) return;
    const registrar = (id, valor) => resultado(id, { ...valor, tipo: tipoGeracao });
    try {
      // Preflight somente de leitura. Confirma a versão atual antes de substituir.
      const alvos = [];
      const substituir = [];
      for (const id of ids) {
        if (!montado.current) return;
        const lista = await atualizar(id);
        const existente = feedbackAtivo(lista, tipoGeracao);
        const item = itens.find(({ matricula }) => matricula.id === id);
        if (existente?.statusEnvio === 'enviado') {
          registrar(id, { estado: 'Excluído', mensagem: 'Desmarque o envio antes de gerar novamente.' });
          continue;
        }
        alvos.push(id);
        if (existente || rascunhos[chaveManual(id, tipoGeracao)]) substituir.push(item.aluno.nome);
      }
      if (!montado.current) return;
      if (substituir.length && !window.confirm(`Regenerar feedback ${tipoGeracao} substituirá o texto revisado e as alterações locais de: ${substituir.join(', ')}. Continuar?`)) return;
      for (const id of alvos) registrar(id, { estado: 'Aguardando' });
      await executarSequencia({
        ids: alvos, atualizar, resultado: registrar, continua: () => montado.current,
        gerar: async (id) => {
          const { data } = await client.mutate({
            mutation: GERAR_FEEDBACKS, variables: { input: { matriculaIds: [id], tipo: tipoGeracao } },
          });
          const feedback = data.gerarFeedbacks[0];
          if (!feedback) throw new Error('O serviço não retornou um feedback. Consulte o estado atual.');
          if (montado.current) {
            aplicar(feedback);
            editarRascunho(feedback.id, null);
            editarRascunho(chaveManual(id, tipoGeracao), null);
            setAberto(feedback.id);
            setTipo(feedback.tipo);
            setEnvio('todos');
            setArquivados(false);
          }
        },
      });
    } catch (falha) {
      if (montado.current) {
        setErro(`Não foi possível preparar a geração: ${mensagemFeedback(falha)} Nenhuma nova chamada de IA foi iniciada.`);
        for (const id of ids) registrar(id, { estado: 'Interrompido', mensagem: 'Falha ao consultar o estado atual antes da geração.' });
      }
    } finally { terminar(); }
  }

  async function persistir({ mutation, variables, campo, matriculaId, limpar }) {
    if (!iniciar()) return;
    let salvou = false;
    try {
      const { data } = await client.mutate({ mutation, variables });
      const feedback = data[campo];
      salvou = true;
      if (!montado.current) return;
      aplicar(feedback);
      if (limpar) editarRascunho(limpar, null);
      setAberto(feedback.id);
      setTipo(feedback.tipo);
      setEnvio('todos');
      if (feedback.status === 'arquivado') setArquivados(true);
      setInfo('Feedback atualizado. O envio só muda pelas ações de marcar ou desmarcar.');
      await atualizar(matriculaId);
    } catch (falha) {
      if (!montado.current) return;
      if (salvou) {
        setErro('Feedback salvo, mas não foi possível atualizar a lista. Consulte novamente antes de outra ação.');
      } else {
        setErro(mensagemFeedback(falha));
        // Conflitos e respostas perdidas não devem apagar o rascunho nem repetir mutations.
        try { await atualizar(matriculaId); } catch {
          setErro(`${mensagemFeedback(falha)} Não foi possível confirmar o estado atual. Atualize a consulta antes de repetir.`);
        }
      }
    } finally { terminar(); }
  }

  function criar(item) {
    const id = item.matricula.id;
    const existente = feedbackAtivo(consultas[id]?.lista, tipo);
    if (existente) { setAberto(existente.id); setInfo('Já existe um feedback ativo deste tipo. Revise o texto existente.'); return; }
    const chave = chaveManual(id, tipo);
    const texto = rascunhos[chave] || '';
    if (!texto.trim()) { setErro('Escreva um texto antes de salvar o feedback.'); return; }
    persistir({ mutation: CRIAR_FEEDBACK_MANUAL, variables: { input: { matriculaId: id, tipo, texto } },
      campo: 'criarFeedbackManual', matriculaId: id, limpar: chave });
  }

  function acao(feedback, nome) {
    const texto = rascunhos[feedback.id] ?? feedback.textoEditado;
    if (nome === 'marcar' && texto !== feedback.textoEditado) return;
    const [mutation, campo, confirmacao] = ACOES[nome];
    if (!window.confirm(confirmacao)) return;
    persistir({ mutation, campo, variables: { id: feedback.id }, matriculaId: feedback.matriculaId });
  }

  const elegiveis = itens.filter(({ matricula }) => {
    const consulta = consultas[matricula.id];
    return consulta?.lista && !consulta.loading && !consulta.error
      && feedbackAtivo(consulta.lista, tipo)?.statusEnvio !== 'enviado';
  }).map(({ matricula }) => matricula.id);
  const pendentes = selecionados.filter((id) => elegiveis.includes(id)
    && !(resultados[id]?.estado === 'Concluído' && resultados[id]?.tipo === tipo));
  const concluidos = Object.values(resultados).filter(({ estado }) => estado === 'Concluído').length;

  const visiveis = itens.filter(({ matricula }) => {
    const q = consultas[matricula.id];
    return envio === 'todos' || !q?.lista || q.error || q.lista.some((f) => f.tipo === tipo
      && f.statusEnvio === envio && (arquivados || f.status === 'ativo'));
  });
  function abrirEditor(feedback, aluno, bloqueado) {
    if (aberto !== feedback.id) return null;
    const texto = rascunhos[feedback.id] ?? feedback.textoEditado;
    return <FeedbackEditor key={feedback.id} feedback={feedback} alunoNome={aluno.nome} texto={texto}
      sujo={texto !== feedback.textoEditado} bloqueado={bloqueado}
      onTexto={(valor) => editarRascunho(feedback.id, valor)}
      onSalvar={() => persistir({ mutation: EDITAR_FEEDBACK, campo: 'editarFeedback', variables: { id: feedback.id, texto }, matriculaId: feedback.matriculaId, limpar: feedback.id })}
      onAcao={(nome) => acao(feedback, nome)} onGerar={() => gerar([feedback.matriculaId], tipo)} />;
  }
  return (
    <div className="feedbacks-area">
      <p>Crie, revise e acompanhe os feedbacks parciais e finais dos seus alunos.</p>
      <div className="feedback-filtros">
        <Field as="select" id="feedback-tipo" label="Tipo" value={tipo} disabled={ocupado} onChange={(e) => mudarTipo(e.target.value)}>
          <option value="parcial">Parcial</option><option value="final">Final</option>
        </Field>
        <Field as="select" id="feedback-envio" label="Envio" value={envio} disabled={ocupado} onChange={(e) => filtro(() => setEnvio(e.target.value))}>
          <option value="todos">Todos</option><option value="rascunho">Rascunhos</option><option value="enviado">Enviados</option>
        </Field>
        <label className="feedback-selecao"><input type="checkbox" checked={arquivados} disabled={ocupado}
          onChange={(e) => filtro(() => setArquivados(e.target.checked))} /> Mostrar arquivados</label>
      </div>
      {itens.length > 1 && <div className="feedback-lote">
        <div className="feedback-acoes">
          <Button disabled={ocupado || !pendentes.length} onClick={() => gerar(pendentes, tipo)}>Gerar para selecionados ({selecionados.length})</Button>
          <Button variant="secundario" disabled={ocupado} onClick={() => setSelecionados(elegiveis.filter((id) => visiveis.some((i) => i.matricula.id === id)))}>Selecionar elegíveis</Button>
          {!!selecionados.length && <Button variant="secundario" disabled={ocupado} onClick={() => setSelecionados([])}>Limpar seleção</Button>}
        </div>
        {!!selecionados.length && <p className="feedback-meta">{pendentes.length} pendente(s). Alunos concluídos não serão gerados novamente nesta sequência.</p>}
      </div>}
      {ocupado && <Loading texto="Operação em andamento. Aguarde o resultado." />}
      {Object.keys(resultados).length > 0 && <div role="status" aria-live="polite">
        <p>{concluidos} de {Object.keys(resultados).length} resultado(s) concluído(s).</p>
        <progress aria-label="Progresso da geração" value={Object.values(resultados).filter(({ estado }) => !['Aguardando', 'Gerando'].includes(estado)).length} max={Object.keys(resultados).length} />
      </div>}
      {erro && <ErrorMessage texto={erro} />}
      {info && <p role="status">{info}</p>}
      {!visiveis.length && <EmptyState titulo="Nenhum feedback neste filtro" acao={<Button variant="secundario" onClick={() => filtro(() => { setEnvio('todos'); setArquivados(false); })}>Limpar filtros</Button>} />}
      {visiveis.map((item) => {
        const { aluno, matricula } = item;
        const consulta = consultas[matricula.id];
        const lista = consulta?.lista || [];
        // A existência é decidida na lista completa, nunca nos filtros visuais.
        const { ativo: existente, ativoVisivel: mostrarAtivo, historicos } = visaoFeedbacks(lista, tipo, envio, arquivados);
        const manual = chaveManual(matricula.id, tipo);
        const bloqueado = ocupado || !consulta?.lista || consulta.loading || Boolean(consulta.error);
        const resultadoAluno = resultados[matricula.id];
        return <section className="feedback-aluno" key={matricula.id} aria-label={`Feedbacks de ${aluno.nome}`}>
          <header className="feedback-cabecalho">
            <div>
              <h3><Link to={`/alunos/${aluno.id}?matricula=${matricula.id}&aba=feedbacks&tipo=${tipo}`}>{aluno.nome}</Link></h3>
              <p className="feedback-meta">{tipo === 'parcial' ? 'Parcial' : 'Final'} · {matricula.turma?.nome} · {matricula.periodoLetivo}</p>
            </div>
            {itens.length > 1 && <label className="feedback-selecao">
              <input type="checkbox" checked={selecionados.includes(matricula.id)} disabled={ocupado || !elegiveis.includes(matricula.id)}
                onChange={(e) => setSelecionados((ids) => e.target.checked ? [...ids, matricula.id] : ids.filter((id) => id !== matricula.id))} /> Selecionar {aluno.nome}
            </label>}
          </header>
          {resultadoAluno && <p role="status"><strong>{resultadoAluno.estado}</strong>{resultadoAluno.mensagem && ` — ${resultadoAluno.mensagem}`}</p>}
          {(!consulta || consulta.loading) && <Loading texto="Consultando feedbacks..." />}
          {consulta?.error && <><ErrorMessage texto={mensagemFeedback(consulta.error)} /><Button variant="secundario" disabled={ocupado || consulta.loading} onClick={() => atualizar(matricula.id).catch(() => {})}>Tentar novamente</Button></>}
          {!existente && consulta?.lista && !consulta.error && envio === 'todos' && <>
            <p>Sem feedback ativo</p>
            {aberto !== manual && <div className="feedback-acoes">
              <Button disabled={bloqueado} onClick={() => gerar([matricula.id], tipo)}>Gerar com IA</Button>
              <Button variant="secundario" disabled={bloqueado} onClick={() => setAberto(manual)}>Escrever feedback</Button>
            </div>}
          </>}
          {mostrarAtivo && <>
            <p><strong>{existente.statusEnvio === 'enviado' ? 'Enviado' : 'Rascunho'}</strong>{rascunhos[existente.id] !== undefined && rascunhos[existente.id] !== existente.textoEditado ? ' · Alterações pendentes' : ''}</p>
            <Button variant="secundario" aria-expanded={aberto === existente.id} onClick={() => setAberto(aberto === existente.id ? null : existente.id)}>{aberto === existente.id ? 'Fechar feedback' : 'Abrir feedback'}</Button>
            {abrirEditor(existente, aluno, bloqueado)}
          </>}
          {existente && rascunhos[manual] && <Button variant="secundario" onClick={() => setAberto(manual)}>Recuperar rascunho manual</Button>}
          {aberto === manual && <form onSubmit={(e) => { e.preventDefault(); criar(item); }}>
            <h4>Feedback {tipo} — {aluno.nome}</h4>
            <Field as="textarea" id={manual} label="Texto do feedback" rows={7} value={rascunhos[manual] || ''} disabled={bloqueado}
              onChange={(e) => editarRascunho(manual, e.target.value)} />
            <div className="feedback-acoes">
              <Button type="submit" disabled={bloqueado || !(rascunhos[manual] || '').trim()}>Salvar</Button>
              <Button variant="secundario" disabled={ocupado} onClick={() => {
                if (!rascunhos[manual] || window.confirm('Cancelar e descartar este rascunho manual?')) { editarRascunho(manual, null); setAberto(null); }
              }}>Cancelar</Button>
            </div>
          </form>}
          {!!historicos.length && <div className="feedback-historicos"><h4>Histórico arquivado</h4>
            {historicos.map((feedback) => <article className="feedback-item" key={feedback.id}>
              <p>Arquivado · {feedback.tipo} · {feedback.statusEnvio === 'enviado' ? 'Enviado' : 'Rascunho'}</p>
              <Button variant="secundario" aria-expanded={aberto === feedback.id} onClick={() => setAberto(aberto === feedback.id ? null : feedback.id)}>{aberto === feedback.id ? 'Fechar arquivado' : 'Abrir arquivado'}</Button>
              {abrirEditor(feedback, aluno, bloqueado)}
            </article>)}
          </div>}
        </section>;
      })}
      <details className="feedback-sobre"><summary>Sobre a geração com IA</summary>
        <p>A geração usa registros ativos do semestre, incluindo aulas arquivadas, com até 40 evidências recentes. Revise o texto antes de enviar por conta própria.</p>
        <p>A geração é sequencial, uma matrícula por chamada. Feedbacks enviados precisam ter o envio desmarcado para regenerar. Histórico de turmas e matrículas encerradas continua disponível.</p>
      </details>
    </div>
  );
}
