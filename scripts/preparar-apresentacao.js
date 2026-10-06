#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const mongoose = require('mongoose');
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
mongoose.set('bufferCommands', false);
// O módulo anterior só executa o seed quando é o programa principal.
const { montarPlano: planoAnterior, argumentos } = require('./popular-demo');
const Usuario = require('../src/models/Usuario');
const Feedback = require('../src/models/Feedback');
const modelos = Object.fromEntries(['Turma', 'Aluno', 'Matricula', 'Aula', 'RegistroDiario']
  .map((nome) => [nome, require(`../src/models/${nome}`)]));
const RAIZ = path.resolve(__dirname, '..');
const CACHE = path.join(RAIZ, 'node_modules/.cache/devclass-apresentacao-v1');
const CONJUNTO = 'devclass-apresentacao-v1';
const NOME_TURMA = 'Intermediário — Terças e Quintas';
const ESPERADOS = { Turma: 1, Aluno: 10, Matricula: 10, Aula: 12, RegistroDiario: 120 };
const PESSOAS = [
  ['Roberta Menezes', 'feminino', ['participation', 'vocabulary'], 'listening'],
  ['Pedro Alencar', 'masculino', ['listening', 'vocabulary'], 'speaking'],
  ['Luísa Andrade', 'feminino', ['reading', 'writing'], 'speaking', ['Cláudio Andrade', 'masculino', 'claudio.andrade@example.com']],
  ['Caio Vasconcelos', 'masculino', ['speaking', 'participation'], 'grammar', ['Renata Vasconcelos', 'feminino', 'renata.vasconcelos@example.com']],
  ['Fernanda Melo', 'feminino', ['grammar', 'writing'], 'pronunciation'],
  ['Gustavo Ribeiro', 'masculino', ['listening', 'vocabulary'], 'writing'],
  ['Bianca Carvalho', 'feminino', ['pronunciation', 'reading'], 'grammar', ['Márcia Carvalho', 'feminino', 'marcia.carvalho@example.com']],
  ['Eduardo Batista', 'masculino', ['participation', 'speaking'], 'listening', ['Sérgio Batista', 'masculino', 'sergio.batista@example.com']],
  ['Renata Oliveira', 'feminino', ['writing', 'grammar'], 'speaking'],
  ['Felipe Dantas', 'masculino', ['vocabulary', 'listening'], 'writing'],
];
const AULAS = [
  ['2026-08-18', ['Present perfect', 'Experiências pessoais'], 'Na conversa sobre experiências pessoais', 'speaking'],
  ['2026-08-20', ['Have you ever', 'Perguntas e respostas sobre experiências'], 'Na entrevista em dupla com have you ever', 'participation'],
  ['2026-08-25', ['Simple past e present perfect', 'Narrativas de viagens'], 'Ao reconstruir uma narrativa de viagem', 'grammar'],
  ['2026-08-27', ['For e since', 'Situações que continuam no presente'], 'Ao comparar situações com for e since', 'grammar'],
  ['2026-09-01', ['Already, yet e just', 'Atualizações sobre acontecimentos'], 'Na troca de novidades com already, yet e just', 'vocabulary'],
  ['2026-09-03', ['Listening', 'Identificação de informações específicas'], 'Na escuta de relatos curtos', 'listening'],
  ['2026-09-08', ['Comparativos', 'Expressão de opiniões'], 'Ao comparar opções e defender uma preferência', 'speaking'],
  ['2026-09-10', ['Vocabulário de viagens', 'Resolução de situações práticas'], 'Na simulação de uma solicitação durante uma viagem', 'vocabulary'],
  ['2026-09-15', ['Leitura', 'Ideias principais e detalhes'], 'Na leitura de um relato de experiências', 'reading'],
  ['2026-09-17', ['Escrita', 'Organização de um relato pessoal'], 'Na revisão do relato pessoal', 'writing'],
  ['2026-09-22', ['Discussão em grupo', 'Justificativa de opiniões'], 'Na discussão em grupo sobre escolhas pessoais', 'participation'],
  ['2026-09-24', ['Revisão integrada', 'Apresentação oral de experiências'], 'Ao apresentar uma experiência e responder às perguntas', 'pronunciation'],
];
// Trajetórias próprias por aluno, em três momentos. Nenhum texto vem de IA.
const TRAJETORIAS = [
  ['Contribuiu com exemplos e retomou palavras já estudadas. Pediu nova escuta para localizar detalhes.', 'Passou a anotar palavras-chave antes de responder. Ainda conferiu detalhes do áudio com a dupla.', 'Relacionou o vocabulário às próprias ideias e confirmou mais detalhes sem ajuda. Precisa continuar a distinguir informações próximas no áudio.'],
  ['Compreendeu a proposta oral, mas respondeu com frases curtas e apoio do roteiro.', 'Acrescentou uma justificativa às respostas em dupla. Hesitou ao formular uma pergunta fora do roteiro.', 'Ampliou uma resposta espontânea e manteve a ideia principal. Pode desenvolver melhor os exemplos ao falar.'],
  ['Organizou as informações por escrito antes de falar. Consultou o roteiro ao apresentar uma ideia.', 'Usou anotações mais curtas para explicar a resposta. Precisou de tempo para iniciar a fala diante do grupo.', 'Apresentou parte do relato sem ler e retomou uma informação com clareza. Ainda precisa praticar respostas sem preparação.'],
  ['Tomou a iniciativa na conversa e envolveu a dupla. Precisou de orientação para escolher o tempo verbal.', 'Manteve a troca de ideias e corrigiu uma forma verbal após reler o exemplo. Ainda alternou tempos ao narrar.', 'Justificou a resposta com autonomia e revisou uma escolha verbal. Precisa conferir a relação entre o momento narrado e o tempo empregado.'],
  ['Organizou frases com atenção à estrutura. Precisou repetir terminações verbais para torná-las mais claras.', 'Revisou a estrutura da resposta e passou a marcar terminações antes da leitura. Algumas ainda ficaram pouco audíveis.', 'Apresentou uma sequência bem organizada e articulou melhor verbos ensaiados. Vale continuar a prática das terminações em fala espontânea.'],
  ['Reconheceu expressões da atividade e compreendeu a orientação oral. Registrou ideias por escrito sem uma sequência clara.', 'Separou a ideia principal dos exemplos antes de escrever. Precisou de apoio para ligar duas partes do relato.', 'Organizou o relato com início e desenvolvimento mais claros. Ainda pode revisar a ligação entre os parágrafos.'],
  ['Leu as expressões com clareza e localizou informações no material. Pediu ajuda para distinguir passado definido de experiência.', 'Comparou exemplos antes de escolher entre simple past e present perfect. Ainda hesitou quando faltava marcador de tempo.', 'Explicou uma escolha de tempo verbal usando o contexto. Precisa manter essa verificação ao produzir respostas mais longas.'],
  ['Cooperou com a dupla e ofereceu uma ideia para a atividade. Precisou que as instruções fossem divididas em etapas.', 'Reformulou a primeira etapa da orientação para a dupla. Pediu confirmação antes de seguir uma instrução mais longa.', 'Retomou a sequência da atividade com menos intervenções e ajudou a organizar o grupo. Deve continuar a conferir detalhes em instruções longas.'],
  ['Planejou a resposta em uma sequência lógica e conferiu as formas verbais. Fez pausas longas para responder sem preparação.', 'Passou a usar palavras-chave em vez de frases completas no planejamento. Ainda interrompeu a fala ao buscar uma expressão.', 'Sustentou uma resposta com menos pausas e manteve as ideias organizadas. Pode praticar reformulações para não interromper a conversa.'],
  ['Usou vocabulário pertinente e compreendeu a orientação oral. Escreveu frases isoladas, sem explicitar as relações entre elas.', 'Incluiu um conector depois de comparar os exemplos. Precisou de ajuda para escolher entre sequência e contraste.', 'Ligou acontecimentos com conectores mais variados após a revisão. Ainda precisa conferir se o conector expressa a relação pretendida.'],
];
const EVIDENCIAS = {
  speaking: ['respondeu com apoio de uma pergunta-modelo', 'acrescentou um exemplo à resposta em dupla', 'justificou uma escolha e retomou a pergunta do colega'],
  listening: ['identificou a ideia principal ao retomar a orientação', 'confirmou uma informação específica após nova escuta', 'anotou palavras-chave e conferiu a sequência das informações'],
  reading: ['localizou uma informação e indicou o trecho correspondente', 'distinguiu a ideia principal de um exemplo no material', 'usou uma informação do material para sustentar a resposta'],
  writing: ['registrou as ideias em frases compreensíveis', 'revisou a sequência das frases após orientação', 'organizou o relato e ajustou a ligação entre duas ideias'],
  grammar: ['comparou a resposta com o modelo antes de escolher a forma verbal', 'corrigiu uma forma verbal ao reler o contexto', 'explicou uma escolha de forma verbal e reviu uma ocorrência'],
  vocabulary: ['recuperou expressões do tópico para formular a resposta', 'substituiu uma palavra repetida por expressão trabalhada', 'selecionou expressões pertinentes e explicou uma delas à dupla'],
  pronunciation: ['repetiu expressões procurando manter a tonicidade', 'ajustou a articulação de uma expressão depois de ouvi-la', 'manteve clareza nas expressões ensaiadas e reviu uma terminação'],
  participation: ['contribuiu com uma ideia e ouviu a proposta da dupla', 'fez uma pergunta pertinente para dar continuidade à atividade', 'ajudou a organizar a troca de ideias e justificou uma contribuição'],
};
const DESAFIOS = [
  ['precisou ouvir novamente para separar detalhes próximos', 'confirmou um detalhe com a dupla depois de anotar palavras-chave', 'identificou mais detalhes, mas ainda pediu confirmação de uma informação'],
  ['dependeu do roteiro para acrescentar detalhes à resposta oral', 'ampliou uma resposta após uma pergunta de apoio', 'acrescentou um exemplo sem roteiro, mas ainda encurtou outra resposta'],
  ['consultou as frases anotadas antes de falar', 'falou usando palavras-chave, com uma pausa para reorganizar a ideia', 'explicou parte da resposta sem ler, ainda hesitando em uma pergunta espontânea'],
  ['alternou tempos verbais e precisou comparar os modelos', 'corrigiu uma forma verbal depois de reler o contexto', 'reviu uma escolha verbal com menos apoio, ainda oscilando em uma frase longa'],
  ['precisou de repetição guiada para articular terminações verbais', 'marcou a terminação antes de ler e tornou um verbo mais claro', 'articulou melhor as formas ensaiadas, mas reduziu uma terminação na fala espontânea'],
  ['listou ideias sem uma sequência escrita clara', 'separou a ideia central dos exemplos com orientação', 'organizou a sequência do relato, ainda precisando ligar melhor dois trechos'],
  ['confundiu uma experiência com um acontecimento em momento definido', 'comparou marcadores de tempo antes de corrigir uma resposta', 'usou o contexto para escolher o tempo verbal, com dúvida em uma frase sem marcador'],
  ['pediu que a instrução oral fosse dividida em partes', 'reformulou a primeira etapa, mas confirmou a seguinte com a dupla', 'seguiu mais etapas sem ajuda, ainda pedindo repetição de uma orientação longa'],
  ['fez pausas prolongadas ao responder fora do roteiro', 'retomou a fala usando uma palavra-chave após hesitar', 'manteve uma resposta mais contínua, com pausa ao reformular uma ideia'],
  ['ligou frases apenas por justaposição', 'incluiu um conector com apoio dos exemplos', 'variou os conectores na revisão, ainda confundindo uma relação de contraste'],
];
class Falha extends Error {}
function exigir(condicao, mensagem) { if (!condicao) throw new Falha(mensagem); }
function hash(texto) { return crypto.createHash('sha256').update(texto).digest('hex'); }
function id(professor, entidade, chave) {
  return new mongoose.Types.ObjectId(hash(`${CONJUNTO}|${professor}|${entidade}|${chave}`).slice(0, 24));
}
function normalizar(valor) {
  if (valor instanceof Date) return valor.toISOString();
  if (valor instanceof mongoose.Types.ObjectId) return String(valor);
  if (Array.isArray(valor)) return valor.map(normalizar);
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.keys(valor).sort()
    .filter((k) => valor[k] !== undefined).map((k) => [k, normalizar(valor[k])]));
  return valor;
}
const igual = (a, b) => JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));
const assinatura = (obj) => hash(JSON.stringify(normalizar(obj)));
function semPrefixo(nome) {
  return typeof nome === 'string' ? nome.replace(/^\s*DEMO(?=$|[\s–—:-])\s*(?:[–—:-]\s*)?/iu, '') : nome;
}
function montarPlano(professor) {
  const plano = [];
  const adicionar = (entidade, chave, dados) => {
    const item = { entidade, chave, dados: { _id: id(professor, entidade, chave), ...dados } };
    item.id = String(item.dados._id); plano.push(item); return item;
  };
  const turma = adicionar('Turma', 'intermediario-tercas-quintas|2026.2', {
    nome: NOME_TURMA, estagio: 'B1', periodoLetivo: '2026.2', professorId: professor, status: 'ativa',
    encontros: ['terca', 'quinta'].map((diaSemana) => ({ diaSemana, horario: '18:30' })),
  });
  const alunos = PESSOAS.map(([nome, generoGramatical, , , responsavel], i) => adicionar('Aluno', `P${String(i + 1).padStart(2, '0')}`, {
    nome, generoGramatical, professorId: professor, status: 'ativo',
    ...(responsavel ? { nomeResponsavel: responsavel[0], generoResponsavel: responsavel[1], contatoResponsavel: responsavel[2] } : {}),
  }));
  const matriculas = alunos.map((aluno) => adicionar('Matricula', `${aluno.id}|${turma.id}|2026.2`, {
    alunoId: aluno.dados._id, turmaId: turma.dados._id, periodoLetivo: '2026.2', status: 'ativa',
  }));
  const aulas = AULAS.map(([data, topicos]) => adicionar('Aula', `${turma.id}|${data}`, {
    turmaId: turma.dados._id, data: new Date(`${data}T00:00:00.000Z`), topicos, status: 'ativa',
  }));
  matriculas.forEach((matricula, p) => aulas.forEach((aula, l) => {
    const fase = Math.floor(l / 4);
    const forte = PESSOAS[p][2][l % 2]; const desafio = PESSOAS[p][3];
    const habilidades = [...new Set([forte, desafio, ...(l % 2 === 0 ? [AULAS[l][3]] : [])])];
    const avaliacoes = habilidades.map((habilidade) => ({
      habilidade,
      desempenho: habilidade === desafio ? (l >= 6 && l % 3 !== 1 ? 'adequado' : 'precisa_de_atencao')
        : PESSOAS[p][2].includes(habilidade) && (l + p) % 3 !== 0 ? 'destaque' : 'adequado',
      observacao: `${AULAS[l][2]}, ${habilidade === desafio ? DESAFIOS[p][fase] : EVIDENCIAS[habilidade][fase]}.`,
    }));
    adicionar('RegistroDiario', `${matricula.id}|${aula.id}`, {
      matriculaId: matricula.dados._id, aulaId: aula.dados._id, status: 'ativo',
      observacaoGeral: `${AULAS[l][2]}, trabalhou a relação entre a resposta e os exemplos da atividade. ${TRAJETORIAS[p][fase]}`,
      avaliacoes,
    });
  }));
  return plano;
}
function dependencias(item, porId) {
  const d = item.dados;
  const ids = [d.alunoId, d.turmaId, d.aulaId, d.matriculaId].filter(Boolean).map(String);
  if (d.matriculaId) {
    const m = porId.get(String(d.matriculaId));
    exigir(m, 'Matrícula ausente no plano.'); ids.push(String(m.dados.alunoId), String(m.dados.turmaId));
  }
  return [...new Set(ids)].map((chave) => porId.get(chave));
}
function identidade(item, doc) {
  const campos = {
    Turma: ['professorId', 'periodoLetivo'], Aluno: ['professorId'],
    Matricula: ['alunoId', 'turmaId', 'periodoLetivo'], Aula: ['turmaId', 'data'],
    RegistroDiario: ['aulaId', 'matriculaId'],
  }[item.entidade];
  exigir(campos.every((campo) => igual(doc[campo], item.dados[campo])),
    `Colisão de identidade/propriedade em ${item.entidade}. Operação interrompida.`);
}
function filtroUnico(item) {
  const d = item.dados;
  return {
    Matricula: { alunoId: d.alunoId, periodoLetivo: d.periodoLetivo },
    Aula: { turmaId: d.turmaId, data: d.data, status: 'ativa' },
    RegistroDiario: { aulaId: d.aulaId, matriculaId: d.matriculaId, status: 'ativo' },
  }[item.entidade];
}
async function validarPlano(plano, professor) {
  const porId = new Map(plano.map((p) => [p.id, p])); const unicos = new Set(); const contagens = {};
  exigir(porId.size === 153, 'Quantidade de identidades inválida.');
  const anteriores = new Set(planoAnterior(professor).map((p) => p.id));
  for (const item of plano) {
    exigir(!anteriores.has(item.id), 'Colisão com o conjunto anterior.');
    await new modelos[item.entidade](item.dados).validate();
    contagens[item.entidade] = (contagens[item.entidade] || 0) + 1;
    exigir(dependencias(item, porId).every(Boolean), 'Referência ausente.');
    const d = item.dados;
    if (d.professorId) exigir(String(d.professorId) === String(professor), 'Propriedade incompatível.');
    if (item.entidade === 'Matricula') exigir(d.periodoLetivo === porId.get(String(d.turmaId)).dados.periodoLetivo, 'Semestre incompatível.');
    if (item.entidade === 'Aula') exigir(d.data.toISOString().endsWith('T00:00:00.000Z')
      && d.data.getUTCFullYear() === 2026 && d.data.getUTCMonth() >= 6 && [2, 4].includes(d.data.getUTCDay())
      && d.data.getTime() <= Date.now(), 'Data inválida, futura ou fora dos encontros/semestre.');
    if (item.entidade === 'RegistroDiario') {
      exigir(String(porId.get(String(d.aulaId)).dados.turmaId) === String(porId.get(String(d.matriculaId)).dados.turmaId), 'Registro vinculado a turmas diferentes.');
      exigir(d.observacaoGeral.trim() && d.avaliacoes.length >= 2 && d.avaliacoes.length <= 3, 'Conteúdo incompleto.');
      exigir(!d.mensagemIAOriginal && !d.mensagemEditada && !d.geradaEm, 'Mensagem diária não deve ser preenchida.');
    }
    const filtro = filtroUnico(item);
    if (filtro) { const chave = `${item.entidade}|${assinatura(filtro)}`; exigir(!unicos.has(chave), 'Chave única repetida.'); unicos.add(chave); }
  }
  assert.deepEqual(contagens, ESPERADOS);
  for (const m of plano.filter((p) => p.entidade === 'Matricula'))
    assert.equal(plano.filter((r) => r.entidade === 'RegistroDiario' && String(r.dados.matriculaId) === m.id).length, 12);
}
async function carregar(plano) {
  const mapa = new Map();
  for (const [entidade, Model] of Object.entries(modelos)) {
    const ids = plano.filter((p) => p.entidade === entidade).map((p) => p.dados._id);
    if (ids.length) for (const doc of await Model.find({ _id: { $in: ids } }).lean()) mapa.set(String(doc._id), doc);
  }
  for (const p of plano) if (mapa.has(p.id)) identidade(p, mapa.get(p.id));
  return mapa;
}
function impedimento(item, mapa, porId) {
  const deps = dependencias(item, porId);
  if (deps.some((p) => !mapa.has(p.id))) return 'Dependência ausente; criação adiada.';
  const estado = (entidade) => mapa.get(deps.find((p) => p.entidade === entidade)?.id)?.status;
  if (item.entidade === 'Matricula' && (estado('Aluno') !== 'ativo' || estado('Turma') !== 'ativa')) return 'Aluno inativo ou turma encerrada; nenhuma reativação automática.';
  if (item.entidade === 'Aula' && estado('Turma') !== 'ativa') return 'Turma encerrada; aula ausente preservada como pendência.';
  if (item.entidade === 'RegistroDiario' && ['Turma', 'Aula', 'Matricula'].some((e) => estado(e) !== 'ativa')) return 'Estrutura encerrada/arquivada impede criar registro faltante.';
  return null;
}
async function preflight(plano, existentes) {
  const mapa = new Map(existentes); const porId = new Map(plano.map((p) => [p.id, p])); const pendentes = new Map();
  for (const item of plano) {
    if (existentes.has(item.id)) continue;
    let motivo = impedimento(item, mapa, porId);
    const filtro = filtroUnico(item);
    if (!motivo && filtro && await modelos[item.entidade].exists({ ...filtro, _id: { $ne: item.dados._id } })) motivo = 'Conflito de unicidade com outro ID; não será sobrescrito.';
    if (motivo) pendentes.set(item.id, motivo); else mapa.set(item.id, item.dados);
  }
  return pendentes;
}
async function inventario() {
  const colecoes = (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).sort();
  const dados = {};
  for (const Model of [Usuario, ...Object.values(modelos), Feedback]) {
    const nome = Model.collection.collectionName;
    dados[Model.modelName] = colecoes.includes(nome) ? {
      quantidade: await Model.countDocuments({}), indices: await Model.collection.listIndexes().toArray(),
    } : { quantidade: 0, indices: [] };
  }
  return { colecoes, dados };
}
function validarIndices(inventarioAtual) {
  for (const Model of Object.values(modelos)) for (const [campos, opcoes] of Model.schema.indexes())
    exigir(inventarioAtual.dados[Model.modelName].indices.some((i) => igual(Object.entries(i.key), Object.entries(campos))
      && Boolean(i.unique) === Boolean(opcoes.unique) && igual(i.partialFilterExpression, opcoes.partialFilterExpression)),
    `Índice esperado ausente/incompatível em ${Model.modelName}; nenhum índice será criado.`);
}
async function planejarNomes(antigos, existentes) {
  const alteracoes = []; const ausentes = [];
  for (const item of antigos) {
    const doc = existentes.get(item.id);
    if (!doc) { ausentes.push(`${item.entidade}: documento anterior ausente`); continue; }
    identidade(item, doc);
    for (const campo of item.entidade === 'Aluno' ? ['nome', 'nomeResponsavel'] : ['nome']) {
      const anterior = doc[campo]; const proposto = semPrefixo(anterior);
      if (anterior === proposto) continue;
      exigir(proposto.trim().length > 0, 'Remoção de prefixo produziria nome vazio; nenhuma renomeação será aplicada.');
      await new modelos[item.entidade]({ ...doc, [campo]: proposto }).validate();
      alteracoes.push({ colecao: modelos[item.entidade].collection.collectionName, id: item.id, campo, anterior, proposto });
    }
  }
  return { alteracoes, ausentes };
}
function backupNomes(alteracoes) {
  if (!alteracoes.length) return;
  fs.mkdirSync(CACHE, { recursive: true, mode: 0o700 });
  const nome = `nomes-${Date.now()}-${process.pid}.json`;
  const fd = fs.openSync(path.join(CACHE, nome), 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(alteracoes, null, 2)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
async function renomear(alteracoes, antigos, existentes, professor, relatorio) {
  const porId = new Map(antigos.map((p) => [p.id, p]));
  backupNomes(alteracoes); // Sempre antes da primeira alteração de nomes.
  for (const alteracao of alteracoes) {
    const item = porId.get(alteracao.id); const { campo, anterior, proposto } = alteracao;
    const filtro = { _id: item.dados._id, professorId: professor, [campo]: anterior };
    if (item.entidade === 'Turma') filtro.periodoLetivo = item.dados.periodoLetivo;
    const resultado = await modelos[item.entidade].updateOne(filtro, { $set: { [campo]: proposto } }, { runValidators: true, timestamps: false });
    if (resultado.matchedCount !== 1) { relatorio.pendencias.push('Nome alterado concorrentemente ou documento indisponível; preservado.'); continue; }
    existentes.get(item.id)[campo] = proposto;
    relatorio.renomeados[campo === 'nomeResponsavel' ? 'responsaveis' : item.entidade === 'Turma' ? 'turmas' : 'alunos']++;
  }
}
async function criar(plano, existentes, relatorio) {
  const porId = new Map(plano.map((p) => [p.id, p])); const mapa = new Map(existentes);
  for (const item of plano) {
    if (existentes.has(item.id)) continue;
    for (const dep of dependencias(item, porId)) {
      const doc = await modelos[dep.entidade].findById(dep.dados._id).lean();
      if (doc) { identidade(dep, doc); mapa.set(dep.id, doc); } else mapa.delete(dep.id);
    }
    const motivo = impedimento(item, mapa, porId);
    if (motivo) { relatorio.pendentes.set(item.id, motivo); continue; }
    try {
      const doc = await new modelos[item.entidade](item.dados).save();
      relatorio.criados.add(item.id); mapa.set(item.id, doc.toObject());
    } catch (erro) {
      if (![11000, 11001].includes(erro.code)) throw erro;
      const doc = await modelos[item.entidade].findById(item.dados._id).lean();
      if (doc) { identidade(item, doc); existentes.set(item.id, doc); mapa.set(item.id, doc); }
      else relatorio.pendentes.set(item.id, 'Conflito de índice durante a criação; dependentes não serão forçados.');
    }
  }
}
async function conferir(plano, antigos, existentes, nomesEsperados, relatorio, exigirCenario = true) {
  const depois = await carregar(plano); const nomesDepois = await carregar(antigos);
  for (const item of antigos) {
    const doc = nomesDepois.get(item.id);
    if (!doc) { relatorio.pendencias.push('Documento anterior ausente na conferência.'); continue; }
    if (!igual(doc, nomesEsperados.get(item.id))) relatorio.pendencias.push('Documento anterior mudou além das renomeações confirmadas; verificar concorrência.');
    for (const campo of item.entidade === 'Aluno' ? ['nome', 'nomeResponsavel'] : ['nome'])
      if (semPrefixo(doc[campo]) !== doc[campo]) relatorio.pendencias.push('Ainda há prefixo em um campo do conjunto anterior.');
  }
  for (const item of plano) {
    if (!depois.has(item.id)) relatorio.pendentes.set(item.id, 'Documento do conjunto novo ausente.');
    else if (existentes.has(item.id) && !igual(depois.get(item.id), existentes.get(item.id))) relatorio.pendentes.set(item.id, 'Documento reutilizado mudou durante a execução; verificar concorrência.');
  }
  const turma = plano.find((p) => p.entidade === 'Turma');
  const aulas = plano.filter((p) => p.entidade === 'Aula'); const aulaIds = new Set(aulas.map((p) => p.id));
  const matriculas = plano.filter((p) => p.entidade === 'Matricula');
  let distribuicaoCorreta = 0;
  for (const m of matriculas) {
    const registros = plano.filter((p) => p.entidade === 'RegistroDiario' && String(p.dados.matriculaId) === m.id).map((p) => depois.get(p.id)).filter(Boolean);
    const conjuntoAulas = new Set(registros.filter((r) => r.status === 'ativo').map((r) => String(r.aulaId)));
    const ok = depois.get(m.id)?.status === 'ativa' && conjuntoAulas.size === 12
      && [...conjuntoAulas].every((aulaId) => aulaIds.has(aulaId) && depois.get(aulaId)?.status === 'ativa' && String(depois.get(aulaId)?.turmaId) === turma.id);
    if (ok) distribuicaoCorreta++; else if (exigirCenario) relatorio.pendentes.set(m.id, 'Matrícula não tem doze registros ativos nas doze aulas ativas; estado existente preservado.');
  }
  const feedbacks = await Feedback.countDocuments({ matriculaId: { $in: matriculas.map((p) => p.dados._id) } });
  console.log(`Distribuição consultada: ${distribuicaoCorreta}/10 matrículas ativas com doze registros ativos, um por aula da turma. Feedbacks existentes: ${feedbacks} (preservados).`);
  if (!existentes.size && feedbacks) relatorio.pendencias.push('Foram encontrados feedbacks concorrentes na turma nova; preservados.');
}
function resumo(plano, existentes, nomes, relatorio, apply) {
  const nomesPlanejados = { turmas: nomes.filter((n) => n.colecao === modelos.Turma.collection.collectionName).length,
    alunos: nomes.filter((n) => n.colecao === modelos.Aluno.collection.collectionName && n.campo === 'nome').length,
    responsaveis: nomes.filter((n) => n.campo === 'nomeResponsavel').length };
  console.log(`${apply ? 'Renomeados' : 'A renomear'}: ${JSON.stringify(apply ? relatorio.renomeados : nomesPlanejados)}.`);
  console.table(Object.fromEntries(Object.entries(ESPERADOS).map(([entidade, planejados]) => [entidade, {
    planejados, [apply ? 'criados' : 'a criar']: plano.filter((p) => p.entidade === entidade && (apply ? relatorio.criados.has(p.id) : !existentes.has(p.id) && !relatorio.pendentes.has(p.id))).length,
    reutilizados: plano.filter((p) => p.entidade === entidade && existentes.has(p.id)).length,
    pendentes: plano.filter((p) => p.entidade === entidade && relatorio.pendentes.has(p.id)).length,
  }])));
  for (const motivo of new Set([...relatorio.pendencias, ...relatorio.pendentes.values()])) console.log(`Pendência: ${motivo}`);
  console.log(`Turma: ${NOME_TURMA}, semestre 2026.2. Usuários e feedbacks criados: 0. Nenhuma chamada à IA ou envio externo.`);
}
async function main() {
  let plano; let existentes; let nomes = []; let apply = false; let resumido = false;
  const relatorio = { criados: new Set(), pendentes: new Map(), pendencias: [], renomeados: { turmas: 0, alunos: 0, responsaveis: 0 } };
  try {
    let opcoes;
    try { opcoes = argumentos(process.argv.slice(2)); } catch { throw new Falha('Argumentos inválidos: não combine modos nem use opções desconhecidas. Consulte --help.'); }
    if (opcoes.help) {
      console.log('Sem modo: simulação. Execute na raiz; nenhuma IA ou novo usuário:');
      console.log('node scripts/preparar-apresentacao.js --dry-run --professor-email professor.demo@example.com');
      console.log('node scripts/preparar-apresentacao.js --apply --professor-email professor.demo@example.com'); return;
    }
    apply = opcoes.apply;
    execFileSync('git', ['check-ignore', '--quiet', 'node_modules/.cache/devclass-apresentacao-v1/nomes.json'], { cwd: RAIZ, stdio: 'ignore' });
    const envPath = path.join(RAIZ, '.env');
    const uri = process.env.MONGODB_URI || (fs.existsSync(envPath) ? require('dotenv').parse(fs.readFileSync(envPath)).MONGODB_URI : undefined);
    exigir(typeof uri === 'string' && uri.trim(), 'MONGODB_URI não configurada; nenhuma gravação.');
    try { await mongoose.connect(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 }); }
    catch { throw new Falha('Não foi possível conectar ao MongoDB. Verifique o acesso à rede e a configuração local; nenhum segredo foi registrado.'); }
    const professor = await Usuario.findOne({ email: opcoes.email }).select('_id email perfil ativo').lean();
    exigir(professor && professor.perfil === 'professor' && professor.ativo === true, 'Professor ausente, inativo ou com perfil incompatível; nenhuma gravação.');
    plano = montarPlano(professor._id); await validarPlano(plano, professor._id);
    const antigos = planoAnterior(professor._id).filter((p) => ['Turma', 'Aluno'].includes(p.entidade));
    const inventarioAntes = await inventario(); validarIndices(inventarioAntes);
    existentes = await carregar(plano); const nomesExistentes = await carregar(antigos);
    const limpeza = await planejarNomes(antigos, nomesExistentes); nomes = limpeza.alteracoes;
    relatorio.pendencias.push(...limpeza.ausentes); relatorio.pendentes = await preflight(plano, existentes);
    console.log('Plano integral validado: 153 documentos novos, identidades, relações, datas, conteúdo e índices.');
    if (apply) {
      exigir(!relatorio.pendencias.length && !relatorio.pendentes.size, 'Preflight incompleto; aplicação bloqueada antes da primeira escrita.');
      await renomear(nomes, antigos, nomesExistentes, professor._id, relatorio);
      await criar(plano, existentes, relatorio);
      await conferir(plano, antigos, existentes, nomesExistentes, relatorio);
    } else {
      const inventarioDepois = await inventario();
      const novosDepois = await carregar(plano); const antigosDepois = await carregar(antigos);
      exigir(igual(inventarioAntes, inventarioDepois) && igual(Object.fromEntries(existentes), Object.fromEntries(novosDepois))
        && igual(Object.fromEntries(nomesExistentes), Object.fromEntries(antigosDepois)), 'Estado mudou durante a simulação; confira concorrência.');
      console.log('Simulação somente leitura: coleções, índices, contagens e documentos inalterados; nenhum backup criado.');
      if (existentes.size === plano.length && nomes.length === 0) await conferir(plano, antigos, existentes, nomesExistentes, relatorio);
    }
    resumo(plano, existentes, nomes, relatorio, apply); resumido = true;
    exigir(!relatorio.pendencias.length && !relatorio.pendentes.size, 'Execução incompleta; pendências preservadas, sem limpeza ou sobrescrita.');
  } catch (erro) {
    console.error(erro instanceof Falha ? erro.message : ['ValidationError', 'AssertionError'].includes(erro.name)
      ? 'Plano ou resultado inválido; execução interrompida.' : 'Falha operacional; eventuais alterações já realizadas foram preservadas. Consulte a simulação para retomar.');
    if (plano && existentes && !resumido) {
      if (apply) try {
        const depois = await carregar(plano);
        for (const p of plano) if (!depois.has(p.id)) relatorio.pendentes.set(p.id, 'Documento ausente após interrupção.');
      } catch { relatorio.pendencias.push('Não foi possível conferir o resultado parcial.'); }
      resumo(plano, existentes, nomes, relatorio, apply);
    }
    process.exitCode = 1;
  } finally {
    try { await mongoose.disconnect(); } catch { console.error('Falha ao encerrar conexão.'); process.exitCode = 1; }
  }
}
if (require.main === module) main();
module.exports = { montarPlano, validarPlano, semPrefixo };
