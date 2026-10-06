import { HABILIDADES, DESEMPENHOS } from '../../utils/datas';

export function hojeLocal(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}
export const topicosLista = (texto) => [...new Set(texto.split('\n').map((t) => t.trim()).filter(Boolean))];
export function conteudoRegistro(registro = {}) {
  return {
    observacaoGeral: (registro.observacaoGeral || '').trim(),
    avaliacoes: (registro.avaliacoes || []).map((a) => ({
      habilidade: a.habilidade, desempenho: a.desempenho,
      ...(a.observacao?.trim() ? { observacao: a.observacao.trim() } : {}),
      ...(a.habilidade === 'outra' ? { outraDescricao: (a.outraDescricao || '').trim() } : {}),
    })),
  };
}
export const iguais = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const temConteudo = (r) => Boolean(r.observacaoGeral.trim() || r.avaliacoes.length);
export const linhaAlterada = (linha) => !iguais(conteudoRegistro(linha.rascunho), linha.salvo);
export const metadados = (aula) => ({ data: aula.data.slice(0, 10), topicos: [...aula.topicos] });
export function validarRegistro(rascunho, existente = false) {
  const r = conteudoRegistro(rascunho);
  if (!temConteudo(r)) return existente ? 'Mantenha uma observação ou avaliação, ou use Arquivar registro.' : '';
  for (const a of r.avaliacoes) {
    if (!HABILIDADES.some(([v]) => v === a.habilidade)) return 'Selecione uma habilidade válida.';
    if (!DESEMPENHOS.some(([v]) => v === a.desempenho)) return 'Selecione um desempenho válido.';
    if (a.habilidade === 'outra' && !a.outraDescricao) return 'Descreva a outra habilidade.';
  }
  return '';
}
export function criarEdicao(turma, aula, itens) {
  return {
    turma, aula: aula || null, data: aula?.data.slice(0, 10) || hojeLocal(), topicos: (aula?.topicos || []).join('\n'),
    aulaSalva: aula ? metadados(aula) : null, ocupado: false, erro: '', info: '', conflitoAula: null, incertoAula: null,
    linhas: Object.fromEntries(itens.map(({ aluno, matricula }) => [matricula.id, {
      aluno, matricula, registro: null, salvo: conteudoRegistro(), rascunho: conteudoRegistro(),
      conhecido: !aula, carregando: Boolean(aula), erroConsulta: '', erro: '', historicos: [], conflito: null, incerto: null, estado: 'Vazio',
    }])),
  };
}
export function edicaoPendente(s) {
  return Boolean(s.incertoAula || s.conflitoAula || (s.aula ? !iguais({ data: s.data, topicos: topicosLista(s.topicos) }, s.aulaSalva)
    : s.data !== hojeLocal() || s.topicos.trim()) || Object.values(s.linhas).some((l) => linhaAlterada(l) || l.incerto || l.conflito));
}
export function podeEditarLinha(s, linha) {
  return s.turma.status === 'ativa' && (!s.aula || s.aula.status === 'ativa')
    && linha.matricula.status === 'ativa' && linha.aluno.status === 'ativo';
}
export function validarEdicao(s) {
  const erros = {};
  const data = new Date(`${s.data}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.data) || Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== s.data)
    erros.aula = 'Informe uma data válida.';
  else if (`${data.getUTCFullYear()}.${data.getUTCMonth() < 6 ? 1 : 2}` !== s.turma.periodoLetivo)
    erros.aula = `Escolha uma data do semestre ${s.turma.periodoLetivo}.`;
  if (s.turma.status !== 'ativa' && (!s.aula || s.aula.status === 'ativa')) erros.aula = 'Turma encerrada: a criação ou edição de aula ativa está indisponível.';
  for (const [id, linha] of Object.entries(s.linhas)) {
    if (!linha.conhecido || !linhaAlterada(linha)) continue;
    if (!podeEditarLinha(s, linha)) {
      erros[id] = `${linha.aluno.nome}: a estrutura está encerrada ou arquivada. O rascunho foi preservado, mas não pode ser salvo como registro ativo.`;
      continue;
    }
    const erro = validarRegistro(linha.rascunho, Boolean(linha.registro));
    if (erro) erros[id] = `${linha.aluno.nome}: ${erro}`;
  }
  return erros;
}
export function aplicarRegistro(linha, registro, preservarRascunho = false) {
  linha.registro = registro;
  linha.salvo = conteudoRegistro(registro || {});
  if (!preservarRascunho) linha.rascunho = conteudoRegistro(registro || {});
  linha.incerto = null; linha.conflito = null; linha.erro = ''; linha.estado = registro ? 'Salvo' : 'Vazio';
}
export async function consultarLinha(s, id, api) {
  const l = s.linhas[id]; l.carregando = true; l.erroConsulta = '';
  try {
    const lista = (await api.registros(id)).filter((r) => r.aulaId === s.aula.id);
    const ativo = lista.find((r) => r.status === 'ativo') || null;
    l.historicos = lista.filter((r) => r.status === 'arquivado');
    if (!l.conhecido) {
      const preservar = linhaAlterada(l);
      aplicarRegistro(l, ativo, preservar);
      if (preservar && ativo && !iguais(conteudoRegistro(l.rascunho), l.salvo)) {
        l.conflito = { remoto: ativo };
        l.erro = 'Há um rascunho local e outra versão salva. Escolha a versão antes de continuar.';
      }
    } else if (!linhaAlterada(l) && !l.incerto && !l.conflito) aplicarRegistro(l, ativo);
    l.conhecido = true;
  } catch {
    l.erroConsulta = 'Não foi possível consultar o registro. Tente novamente antes de salvar este aluno.';
  } finally { l.carregando = false; }
}
const codigo = (erro) => (erro?.errors || erro?.graphQLErrors || [])[0]?.extensions?.code;
const mensagem = (erro) => (erro?.errors || erro?.graphQLErrors || [])[0]?.message || 'Não foi possível confirmar o salvamento. Consulte novamente antes de tentar salvar.';
const incerto = (erro) => !['BAD_USER_INPUT', 'FORBIDDEN', 'NOT_FOUND', 'UNAUTHENTICATED', 'CONFLICT'].includes(codigo(erro));
function adotarAula(s, aula, preservarMeta = false) {
  s.aula = aula; s.aulaSalva = metadados(aula);
  if (!preservarMeta) { s.data = s.aulaSalva.data; s.topicos = aula.topicos.join('\n'); }
  s.incertoAula = null; s.conflitoAula = null;
}
async function reconciliarAula(s, api) {
  const tentativa = s.incertoAula;
  const aulas = await api.aulas();
  const encontrada = tentativa.id ? aulas.find((a) => a.id === tentativa.id)
    : aulas.find((a) => a.status === 'ativa' && a.data.slice(0, 10) === tentativa.meta.data);
  if (encontrada && iguais(metadados(encontrada), tentativa.meta)) {
    adotarAula(s, encontrada, true); return true;
  }
  if (encontrada && tentativa.id && iguais(metadados(encontrada), s.aulaSalva)) { s.incertoAula = null; return false; }
  if (encontrada) { s.conflitoAula = encontrada; s.erro = 'A aula encontrada tem dados diferentes. Confira antes de continuar.'; return false; }
  s.incertoAula = null; return false;
}
async function reconciliarRegistro(s, linha, api) {
  const tentativa = linha.incerto;
  const registros = (await api.registros(linha.matricula.id)).filter((r) => r.aulaId === s.aula.id);
  const atual = tentativa.id ? registros.find((r) => r.id === tentativa.id) : registros.find((r) => r.status === 'ativo');
  if (atual?.status === 'ativo' && iguais(conteudoRegistro(atual), tentativa.conteudo)) {
    aplicarRegistro(linha, atual, !iguais(conteudoRegistro(linha.rascunho), tentativa.conteudo)); return true;
  }
  if (atual?.id === linha.registro?.id && atual?.status === 'ativo' && iguais(conteudoRegistro(atual), linha.salvo)) { linha.incerto = null; return false; }
  if (atual) {
    linha.conflito = { remoto: atual }; linha.erro = 'O texto encontrado difere do envio pendente. Escolha a versão antes de continuar.'; return false;
  }
  linha.incerto = null;
  if (tentativa.id) { linha.conflito = { remoto: null }; linha.erro = 'O registro salvo não está disponível. Revise o conflito.'; }
  return false;
}
export async function abrirAulaEncontrada(s, aula, api, avisar = () => {}) {
  if (s.ocupado) return;
  s.ocupado = true; adotarAula(s, aula); s.erro = ''; avisar();
  try {
    for (const [id, l] of Object.entries(s.linhas)) {
      const local = l.rascunho; const temLocal = temConteudo(conteudoRegistro(local));
      l.conhecido = false;
      await consultarLinha(s, id, api);
      if (temLocal) {
        l.rascunho = local;
        if (l.registro && !iguais(conteudoRegistro(local), l.salvo)) {
          l.conflito = { remoto: l.registro }; l.erro = 'Há um texto salvo e um rascunho local. Escolha qual versão revisar.';
        }
      }
      avisar();
    }
    s.info = 'Aula existente aberta. Seus rascunhos foram mantidos; resolva as diferenças antes de salvar.';
  } finally { s.ocupado = false; avisar(); }
}
export function resolverRegistro(linha, usarLocal) {
  const remoto = linha.conflito?.remoto;
  aplicarRegistro(linha, remoto?.status === 'ativo' ? remoto : null, usarLocal);
}

// Estado em memória retém cada ID e referência salva assim que a mutation retorna.
// O adaptador é injetado para exercitar falhas sem acessar banco ou IA nos testes.
export async function salvarEdicao(s, api, avisar = () => {}, continua = () => true) {
  if (s.ocupado) return;
  const erros = validarEdicao(s);
  s.erro = erros.aula || ''; s.info = '';
  for (const [id, l] of Object.entries(s.linhas)) l.erro = erros[id] || (l.conflito ? l.erro : '');
  if (Object.keys(erros).length) { if (!s.erro) s.erro = 'Corrija os campos indicados antes de salvar a aula e os registros.'; avisar(); return; }
  s.ocupado = true; avisar(); let salvos = 0;
  try {
    if (s.incertoAula) {
      try { await reconciliarAula(s, api); }
      catch { s.erro = 'Não foi possível consultar a aula após a resposta incerta. Nenhuma gravação repetida.'; return; }
    }
    if (s.conflitoAula) { s.erro = 'Abra ou confira a aula encontrada antes de continuar.'; return; }
    const meta = { data: s.data, topicos: topicosLista(s.topicos) };
    if (!s.aula || !iguais(meta, s.aulaSalva)) {
      try {
        const aulas = await api.aulas();
        if (!continua()) return;
        if (!s.aula) {
          const existente = aulas.find((a) => a.status === 'ativa' && a.data.slice(0, 10) === meta.data);
          if (existente) { s.conflitoAula = existente; s.erro = 'Já existe uma aula nesta data. Você pode abri-la sem perder seus rascunhos.'; return; }
        } else {
          const atual = aulas.find((a) => a.id === s.aula.id);
          if (!atual || atual.status !== s.aula.status || !iguais(metadados(atual), s.aulaSalva)) {
            s.conflitoAula = atual || s.aula; s.erro = 'Os dados da aula mudaram. Confira a versão salva antes de continuar.'; return;
          }
        }
        const id = s.aula?.id;
        const input = id ? {
          ...(meta.data !== s.aulaSalva.data ? { data: meta.data } : {}),
          ...(!iguais(meta.topicos, s.aulaSalva.topicos) ? { topicos: meta.topicos } : {}),
        } : { turmaId: s.turma.id, ...meta };
        try { adotarAula(s, await (id ? api.atualizarAula(id, input) : api.criarAula(input))); avisar(); }
        catch (falha) {
          s.erro = mensagem(falha);
          if (incerto(falha)) {
            s.incertoAula = { id, meta };
            try { if (await reconciliarAula(s, api)) s.erro = 'Aula salva confirmada por consulta. Tente salvar os registros pendentes.'; } catch { /* Manter tentativa para reconciliar antes de qualquer retry. */ }
          } else if (codigo(falha) === 'CONFLICT') {
            try { s.conflitoAula = (await api.aulas()).find((a) => a.id !== id && a.status === 'ativa' && a.data.slice(0, 10) === meta.data) || null; } catch { /* A próxima ação começa por consulta. */ }
          }
          return;
        }
      } catch { s.erro = 'Não foi possível consultar a aula. Nenhum registro foi enviado.'; return; }
    }
    for (const l of Object.values(s.linhas)) {
      if (!continua()) return;
      if (!l.conhecido || l.erroConsulta || l.carregando || !podeEditarLinha(s, l)) continue;
      if (l.incerto) {
        try { if (await reconciliarRegistro(s, l, api)) salvos++; }
        catch { l.erro = 'Não foi possível consultar o resultado anterior. Nenhum envio repetido.'; continue; }
      }
      if (l.conflito || !linhaAlterada(l)) continue;
      const conteudo = conteudoRegistro(l.rascunho);
      if (!l.registro && !temConteudo(conteudo)) continue;
      l.estado = 'Salvando'; avisar();
      try {
        // Nunca inferir ausência de uma consulta falha; checar concorrência visível.
        const lista = (await api.registros(l.matricula.id)).filter((r) => r.aulaId === s.aula.id);
        const remoto = lista.find((r) => r.status === 'ativo') || null;
        if ((l.registro && (remoto?.id !== l.registro.id || !iguais(conteudoRegistro(remoto), l.salvo))) || (!l.registro && remoto)) {
          l.conflito = { remoto }; l.erro = 'Já existe outra versão salva. Seu rascunho foi mantido.'; l.estado = 'Erro'; avisar(); continue;
        }
      } catch {
        l.erroConsulta = 'Falha ao consultar a versão salva. Tente a consulta novamente antes de salvar este aluno.'; l.estado = 'Erro'; avisar(); continue;
      }
      if (!continua()) return;
      const id = l.registro?.id;
      try {
        const input = { observacaoGeral: conteudo.observacaoGeral || null, avaliacoes: conteudo.avaliacoes };
        const registro = await (id ? api.atualizarRegistro(id, input) : api.adicionarRegistro({ ...input, aulaId: s.aula.id, matriculaId: l.matricula.id }));
        aplicarRegistro(l, registro); salvos++;
      } catch (falha) {
        l.erro = mensagem(falha); l.estado = 'Erro';
        if (incerto(falha)) {
          l.incerto = { id, conteudo };
          try { if (await reconciliarRegistro(s, l, api)) salvos++; } catch { /* Tentativa retida sem retentativa automática. */ }
        } else if (codigo(falha) === 'CONFLICT') {
          try {
            const remoto = (await api.registros(l.matricula.id)).find((r) => r.aulaId === s.aula.id && r.status === 'ativo');
            if (remoto) l.conflito = { remoto };
          } catch { l.erroConsulta = 'Consulte novamente antes de salvar este aluno.'; }
        }
        if (['UNAUTHENTICATED', 'FORBIDDEN'].includes(codigo(falha))) break;
      }
      avisar();
    }
    const falhas = Object.values(s.linhas).filter((l) => l.erro || l.erroConsulta || l.incerto || l.conflito || !l.conhecido).length;
    const total = Object.values(s.linhas).filter((l) => l.registro).length;
    s.info = falhas ? `Aula salva; ${salvos} registro(s) salvo(s). ${falhas} aluno(s) com pendências.`
      : total ? `Aula salva; ${salvos} registro(s) salvo(s) agora. Você está editando esta aula.` : 'Aula salva; nenhuma observação registrada';
  } finally { s.ocupado = false; avisar(); }
}
