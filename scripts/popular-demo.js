#!/usr/bin/env node
'use strict';

// Execução explícita, sem servidor HTTP, IA, limpeza ou atualização de existentes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const mongoose = require('mongoose');

// Definidos antes de compilar qualquer modelo: até a simulação deve ser só leitura.
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
mongoose.set('bufferCommands', false);
const Usuario = require('../src/models/Usuario');
const modelos = Object.fromEntries(['Turma', 'Aluno', 'Matricula', 'Aula', 'RegistroDiario', 'Feedback']
  .map((nome) => [nome, require(`../src/models/${nome}`)]));
const RAIZ = path.resolve(__dirname, '..');
const CONJUNTO = 'devclass-demo-v1';
const ESPERADOS = { Turma: 4, Aluno: 24, Matricula: 30, Aula: 24, RegistroDiario: 100, Feedback: 18 };
const CACHE = path.join(RAIZ, 'node_modules', '.cache', CONJUNTO);
const NOMES = [
  ['Marina Duarte', 'feminino'], ['Lucas Monteiro', 'masculino'],
  ['Júlia Nogueira', 'feminino'], ['Rafael Azevedo', 'masculino'],
  ['Camila Reis', 'feminino'], ['André Martins', 'masculino'],
  ['Helena Prado', 'feminino'], ['Gabriel Tavares', 'masculino'],
  ['Isabela Fontes', 'feminino'], ['Henrique Barros', 'masculino'],
  ['Larissa Freitas', 'feminino'], ['Mateus Sampaio', 'masculino'],
  ['Clara Pires', 'feminino'], ['Daniel Farias', 'masculino'],
  ['Sofia Brandão', 'feminino'], ['Bruno Macedo', 'masculino'],
  ['Alex Torres', 'neutro'], ['Sam Ribeiro', 'neutro'],
  ['Ana Luísa Vieira', 'feminino'], ['Diego Sales', 'masculino'],
  ['Luana Campos', 'feminino'], ['Thiago Albuquerque', 'masculino'],
  ['Patrícia Lima', 'feminino'], ['Vitor Rocha', 'masculino'],
];
const RESPONSAVEIS = [
  ['Eduardo Duarte', 'masculino'], ['Renata Monteiro', 'feminino'],
  ['Marta Nogueira', 'feminino'], ['Paulo Azevedo', 'masculino'],
  ['Roberto Reis', 'masculino'], ['Teresa Martins', 'feminino'],
  ['Otávio Prado', 'masculino'], ['Lívia Tavares', 'feminino'],
  ['Cecília Fontes', 'feminino'], ['Augusto Barros', 'masculino'],
  ['Sérgio Freitas', 'masculino'], ['Beatriz Sampaio', 'feminino'],
];
const TURMAS = [
  ['atual-intermediario', 'Intermediário', 'B1', '2026.2', '18:30'],
  ['atual-avancado', 'Avançado', 'B2', '2026.2', '19:30'],
  ['atual-basico', 'Básico', 'A2', '2026.2', '17:30'],
  ['historico', 'Semestre anterior', 'B1', '2026.1', '18:30'],
];
const TOPICOS = {
  A2: ['Rotina e horários', 'Descrição de pessoas', 'Simple past', 'Viagens', 'Experiências cotidianas'],
  B1: ['Present perfect', 'Experiências pessoais', 'For e since', 'Compreensão de instruções', 'Narrativa de acontecimentos'],
  B2: ['Argumentos e opiniões', 'Meio ambiente', 'Leitura crítica', 'Comparação de pontos de vista', 'Texto argumentativo'],
};
const HABILIDADES = ['speaking', 'listening', 'reading', 'writing', 'grammar', 'vocabulary', 'pronunciation', 'participation'];
const OBSERVACOES = {
  speaking: 'Apresentou uma resposta oral usando o vocabulário do tópico.',
  listening: 'Pediu repetição das instruções antes de iniciar a atividade.',
  reading: 'Localizou informações no texto e retomou um trecho para justificar a resposta.',
  writing: 'Revisou a organização do parágrafo após orientação.',
  grammar: 'Corrigiu uma forma verbal depois de comparar os exemplos.',
  vocabulary: 'Utilizou palavras do tópico em uma frase própria.',
  pronunciation: 'Repetiu a expressão e ajustou a tonicidade com apoio.',
  participation: 'Contribuiu com uma pergunta durante a atividade em dupla.',
  outra: 'Separou a ideia principal dos exemplos ao planejar a resposta.',
};
class FalhaControlada extends Error {}
function exigir(condicao, mensagem) { if (!condicao) throw new FalhaControlada(mensagem); }
function hash(valor) { return crypto.createHash('sha256').update(valor).digest('hex'); }
function idEstavel(professor, entidade, chave) {
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
function assinatura(documento, ignorarVersao = false) {
  const obj = documento.toObject ? documento.toObject() : { ...documento };
  if (ignorarVersao) { delete obj.updatedAt; delete obj.__v; }
  return hash(JSON.stringify(normalizar(obj)));
}
function argumentos(args) {
  let modo; let email = 'professor.demo@example.com'; let emailInformado = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') {
      exigir(args.length === 1, 'Use --help sozinho.');
      return { help: true };
    }
    if (['--dry-run', '--apply'].includes(arg)) {
      exigir(!modo, 'Escolha somente um modo: --dry-run ou --apply.');
      modo = arg;
    } else if (arg === '--professor-email') {
      exigir(!emailInformado && args[i + 1] && !args[i + 1].startsWith('--'), 'Informe --professor-email uma única vez, seguido do email.');
      email = args[++i].trim().toLowerCase(); emailInformado = true;
    } else throw new FalhaControlada('Opção desconhecida. Consulte --help.');
  }
  exigir(/^\S+@\S+\.\S+$/.test(email), 'Email do professor inválido.');
  return { apply: modo === '--apply', email };
}
function montarPlano(professor) {
  const plano = []; const alunos = []; const turmas = []; const matriculas = [];
  function adicionar(entidade, chave, dados, final = {}) {
    const item = { entidade, chave, dados: { _id: idEstavel(professor, entidade, chave), ...dados }, final };
    item.id = String(item.dados._id);
    plano.push(item); return item;
  }
  for (const [chave, nome, estagio, periodoLetivo, horario] of TURMAS) {
    const t = adicionar('Turma', `${chave}|${periodoLetivo}`, {
      nome, estagio, periodoLetivo, professorId: professor, status: 'ativa',
      encontros: ['segunda', 'quarta'].map((diaSemana) => ({ diaSemana, horario })),
    }, chave === 'historico' ? { status: 'encerrada' } : {});
    t.aulas = []; turmas.push(t);
  }
  for (const [i, [nome, generoGramatical]] of NOMES.entries()) {
    const dados = { nome, generoGramatical, professorId: professor, status: 'ativo' };
    if (i < 12) Object.assign(dados, {
      nomeResponsavel: RESPONSAVEIS[i][0], generoResponsavel: RESPONSAVEIS[i][1],
      contatoResponsavel: `responsavel${String(i + 1).padStart(2, '0')}@example.com`,
    });
    alunos.push(adicionar('Aluno', `A${String(i + 1).padStart(2, '0')}`, dados, i >= 22 ? { status: 'inativo' } : {}));
  }
  for (let i = 0; i < 18; i++) {
    const grupos = [turmas[Math.floor(i / 6)], ...(i < 12 ? [turmas[3]] : [])];
    for (const turma of grupos) {
      const historico = turma === turmas[3];
      const m = adicionar('Matricula', `${alunos[i].id}|${turma.id}|${turma.dados.periodoLetivo}`, {
        alunoId: alunos[i].dados._id, turmaId: turma.dados._id, periodoLetivo: turma.dados.periodoLetivo, status: 'ativa',
      }, historico ? { status: 'encerrada' } : {});
      Object.assign(m, { aluno: alunos[i], turma, numero: i + 1, historico }); matriculas.push(m);
    }
  }
  for (const turma of turmas) {
    const historico = turma === turmas[3];
    const datas = historico ? ['02', '04', '09', '11', '16', '18'].map((dia) => `2026-03-${dia}`)
      : ['14', '16', '21', '23', '28', '30'].map((dia) => `2026-09-${dia}`);
    for (const [l, data] of datas.entries()) turma.aulas.push(adicionar('Aula', `${turma.id}|${data}`, {
      turmaId: turma.dados._id, data: new Date(`${data}T00:00:00.000Z`),
      topicos: l === 5 ? [] : [TOPICOS[turma.dados.estagio][l]], status: 'ativa',
    }, historico || l === 1 ? { status: 'arquivada' } : {}));
  }
  for (const m of matriculas.filter((m) => m.numero <= 16)) {
    for (let l = 0; l < (m.historico ? 3 : 4); l++) {
      const aula = m.turma.aulas[l]; const topico = aula.dados.topicos[0];
      const formato = m.historico ? (m.numero + l) % 3 : l === 0 ? 0 : l === 1 ? 1 : 2;
      const avaliacoes = [];
      if (formato !== 0) {
        const habilidades = l === 1 ? ['speaking', 'listening']
          : [HABILIDADES[(m.numero + l) % 8], HABILIDADES[(m.numero + l + 3) % 8]];
        if (l >= 2 && m.numero % 3 === 0) habilidades.push('outra');
        for (const [h, habilidade] of habilidades.entries()) avaliacoes.push({
          habilidade,
          desempenho: l === 1 ? (h === 0 ? 'destaque' : 'precisa_de_atencao') : ['adequado', 'destaque', 'precisa_de_atencao'][(m.numero + l + h) % 3],
          observacao: `${OBSERVACOES[habilidade]} Tema: ${topico.toLowerCase()}.`,
          ...(habilidade === 'outra' ? { outraDescricao: 'Organização das ideias' } : {}),
        });
      }
      const evidencias = [
        'respondeu perguntas com apoio de exemplos', 'relacionou o vocabulário a uma situação pessoal',
        'revisou a frase depois de uma orientação', 'organizou a resposta em duas etapas',
      ];
      const observacao = `${m.aluno.dados.nome}: ${evidencias[(m.numero + l) % 4]} na atividade sobre ${topico.toLowerCase()}. `
        + (l >= 2 ? 'Retomou os exemplos anteriores e explicou uma escolha com menos apoio.' : 'Conferiu as instruções com a dupla antes da resposta.');
      const arquivado = l === 2 && (m.historico ? m.numero <= 6 : [1, 2, 7, 8, 13, 14].includes(m.numero));
      adicionar('RegistroDiario', `${m.id}|${aula.id}`, {
        aulaId: aula.dados._id, matriculaId: m.dados._id, avaliacoes,
        ...(formato !== 1 ? { observacaoGeral: observacao } : {}), status: 'ativo',
      }, arquivado ? { status: 'arquivado' } : {});
    }
  }
  for (const m of matriculas.filter((m) => m.numero <= (m.historico ? 3 : 6))) {
    const grupo = m.historico ? m.numero : Math.ceil(m.numero / 2);
    for (const tipo of ['parcial', 'final']) {
      const texto = `Feedback ${tipo} manual de demonstração — ${m.aluno.dados.nome}, semestre ${m.dados.periodoLetivo}. `
        + `Nas atividades sobre present perfect e experiências pessoais, trabalhou respostas com exemplos e vocabulário do tópico. `
        + (tipo === 'parcial' ? 'Como próximo passo, sugerimos retomar as instruções em pequenas etapas e ampliar as respostas com um exemplo pessoal.'
          : 'As evidências deste período mostram trabalho de organização das respostas e revisão com orientação. Recomenda-se continuar a prática de compreensão de instruções e relato de experiências.');
      adicionar('Feedback', `${m.id}|${tipo}`, {
        matriculaId: m.dados._id, tipo, textoEditado: texto, geradoPorIA: false, status: 'ativo', statusEnvio: 'rascunho',
      }, grupo === 2 ? { statusEnvio: 'enviado', enviadoEm: new Date(m.historico ? '2026-06-25T15:00:00.000Z' : '2026-10-01T15:00:00.000Z') }
        : grupo === 3 ? { status: 'arquivado' } : {});
    }
  }
  return plano;
}
function dependencias(item, porId) {
  const d = item.dados;
  const ids = [d.alunoId, d.turmaId, d.aulaId, d.matriculaId].filter(Boolean).map(String);
  if (d.matriculaId) {
    const m = porId.get(String(d.matriculaId));
    ids.push(String(m.dados.alunoId), String(m.dados.turmaId));
  }
  return [...new Set(ids)].map((id) => porId.get(id));
}
function verificarEstrutura(item, documento) {
  const campos = {
    Turma: ['professorId', 'periodoLetivo'], Aluno: ['professorId'],
    Matricula: ['alunoId', 'turmaId', 'periodoLetivo'], Aula: ['turmaId', 'data'],
    RegistroDiario: ['aulaId', 'matriculaId'], Feedback: ['matriculaId', 'tipo'],
  }[item.entidade];
  exigir(campos.every((campo) => JSON.stringify(normalizar(documento[campo])) === JSON.stringify(normalizar(item.dados[campo]))),
    `Colisão de identidade/referências em ${item.entidade}. Nenhum documento incompatível será reutilizado.`);
}
function filtroUnico(item) {
  const d = item.dados;
  const filtros = {
    Matricula: { alunoId: d.alunoId, periodoLetivo: d.periodoLetivo },
    Aula: { turmaId: d.turmaId, data: d.data, status: 'ativa' },
    RegistroDiario: { aulaId: d.aulaId, matriculaId: d.matriculaId, status: 'ativo' },
    Feedback: { matriculaId: d.matriculaId, tipo: d.tipo, status: 'ativo' },
  };
  return filtros[item.entidade];
}
async function validarPlano(plano) {
  const porId = new Map(plano.map((p) => [p.id, p]));
  exigir(porId.size === plano.length, 'Colisão entre IDs do plano.');
  const unicos = new Set(); const contagens = {};
  for (const item of plano) {
    contagens[item.entidade] = (contagens[item.entidade] || 0) + 1;
    await new modelos[item.entidade](item.dados).validate();
    await new modelos[item.entidade]({ ...item.dados, ...item.final }).validate();
    exigir(dependencias(item, porId).every(Boolean), 'Referência ausente no plano.');
    if (item.entidade === 'Matricula') {
      const turma = porId.get(String(item.dados.turmaId));
      exigir(turma.dados.periodoLetivo === item.dados.periodoLetivo, 'Semestre incompatível na matrícula.');
      exigir(String(turma.dados.professorId) === String(porId.get(String(item.dados.alunoId)).dados.professorId), 'Propriedade incompatível.');
    }
    if (item.entidade === 'Aula') {
      const turma = porId.get(String(item.dados.turmaId)); const data = item.dados.data;
      exigir(`${data.getUTCFullYear()}.${data.getUTCMonth() < 6 ? 1 : 2}` === turma.dados.periodoLetivo
        && [1, 3].includes(data.getUTCDay()) && data.getUTCHours() === 0, 'Data fora do semestre/encontros.');
    }
    if (item.entidade === 'RegistroDiario') exigir(
      String(porId.get(String(item.dados.aulaId)).dados.turmaId) === String(porId.get(String(item.dados.matriculaId)).dados.turmaId),
      'Registro com aula e matrícula de turmas diferentes.');
    const filtro = filtroUnico(item);
    if (filtro) {
      const chave = `${item.entidade}:${JSON.stringify(normalizar(filtro))}`;
      exigir(!unicos.has(chave), 'Chave única repetida no plano.'); unicos.add(chave);
    }
  }
  assert.deepEqual(contagens, ESPERADOS);
  const finais = (entidade) => plano.filter((p) => p.entidade === entidade).map((p) => ({ ...p.dados, ...p.final }));
  assert.equal(finais('Aluno').filter((p) => p.status === 'inativo').length, 2);
  assert.equal(finais('Matricula').filter((p) => p.status === 'ativa').length, 18);
  assert.equal(finais('Aula').filter((p) => p.status === 'arquivada').length, 9);
  assert.equal(finais('RegistroDiario').filter((p) => p.status === 'arquivado').length, 12);
  for (const [status, statusEnvio] of [['ativo', 'rascunho'], ['ativo', 'enviado'], ['arquivado', 'rascunho']])
    assert.equal(finais('Feedback').filter((p) => p.status === status && p.statusEnvio === statusEnvio).length, 6);
}
async function carregar(plano) {
  const encontrados = new Map();
  for (const [entidade, Model] of Object.entries(modelos)) {
    const ids = plano.filter((p) => p.entidade === entidade).map((p) => p.dados._id);
    for (const doc of await Model.find({ _id: { $in: ids } }).lean()) encontrados.set(String(doc._id), doc);
  }
  for (const item of plano) if (encontrados.has(item.id)) verificarEstrutura(item, encontrados.get(item.id));
  return encontrados;
}
async function inventario() {
  const colecoes = (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).sort();
  const dados = {};
  for (const Model of [Usuario, ...Object.values(modelos)]) {
    const nome = Model.collection.collectionName;
    dados[Model.modelName] = colecoes.includes(nome) ? {
      quantidade: await Model.countDocuments({}), indices: await Model.collection.listIndexes().toArray(),
    } : { quantidade: 0, indices: [] };
  }
  return { colecoes, dados };
}
function indicesAusentes(inventarioAtual) {
  const faltas = [];
  for (const Model of [Usuario, ...Object.values(modelos)]) {
    const indices = inventarioAtual.dados[Model.modelName].indices;
    for (const [campos, opcoes] of Model.schema.indexes()) {
      if (!indices.some((indice) => JSON.stringify(Object.entries(indice.key)) === JSON.stringify(Object.entries(campos))
        && Boolean(indice.unique) === Boolean(opcoes.unique)
        && JSON.stringify(normalizar(indice.partialFilterExpression)) === JSON.stringify(normalizar(opcoes.partialFilterExpression))))
        faltas.push(`${Model.modelName}: índice esperado ausente ou incompatível`);
    }
  }
  return faltas;
}
function lerDiario(arquivo, professor) {
  if (!fs.existsSync(arquivo)) return { versao: 1, conjunto: CONJUNTO, professor: String(professor), criados: [], pendentes: {} };
  let diario;
  try { diario = JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { throw new FalhaControlada('Registro local ilegível; não será sobrescrito.'); }
  exigir(diario.versao === 1 && diario.conjunto === CONJUNTO && diario.professor === String(professor)
    && Array.isArray(diario.criados) && diario.pendentes && typeof diario.pendentes === 'object', 'Registro local incompatível.');
  return diario;
}
function gravarDiario(arquivo, diario) {
  const temp = `${arquivo}.tmp`;
  const fd = fs.openSync(temp, 'w', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(diario)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp, arquivo);
}
function bloquearLocal(arquivo) {
  try {
    const fd = fs.openSync(arquivo, 'wx', 0o600);
    fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd);
  } catch (erro) {
    if (erro.code !== 'EEXIST') throw erro;
    const pid = Number(fs.readFileSync(arquivo, 'utf8'));
    exigir(Number.isSafeInteger(pid) && pid > 0, 'Trava local inválida; confira se outra execução está em andamento.');
    try { process.kill(pid, 0); throw new FalhaControlada('Outra execução de povoamento está em andamento.'); }
    catch (e) { if (e.code !== 'ESRCH') throw e; }
    fs.unlinkSync(arquivo); return bloquearLocal(arquivo);
  }
  return () => fs.unlinkSync(arquivo);
}
function motivoDependencia(item, mapa, pendencias, porId) {
  const deps = dependencias(item, porId);
  if (deps.some((d) => !mapa.has(d.id) || pendencias.has(d.id))) return 'Dependência ausente ou pendente.';
  const documento = (entidade) => deps.find((d) => d.entidade === entidade);
  const ativo = (entidade, status) => mapa.get(documento(entidade)?.id)?.status === status;
  if (item.entidade === 'Matricula' && (!ativo('Turma', 'ativa') || !ativo('Aluno', 'ativo'))) return 'Aluno inativo ou turma encerrada; estrutura preservada.';
  if (item.entidade === 'Aula' && !ativo('Turma', 'ativa')) return 'Turma encerrada; não será reativada.';
  if (item.entidade === 'RegistroDiario' && (!ativo('Turma', 'ativa') || !ativo('Matricula', 'ativa') || !ativo('Aula', 'ativa')))
    return 'Estrutura encerrada/arquivada impede novo registro operacional.';
  return null;
}
async function preparar(plano, existentes) {
  const mapa = new Map(existentes); const pendencias = new Map(); const porId = new Map(plano.map((p) => [p.id, p]));
  for (const item of plano) {
    if (existentes.has(item.id)) continue;
    let motivo = motivoDependencia(item, mapa, pendencias, porId);
    const filtro = filtroUnico(item);
    if (!motivo && filtro && await modelos[item.entidade].exists({ ...filtro, _id: { $ne: item.dados._id } })) motivo = 'Conflito de unicidade com documento de outro ID.';
    if (motivo) pendencias.set(item.id, motivo);
    else mapa.set(item.id, item.dados);
  }
  return pendencias;
}
function resumo(plano, existentes, criados, pendencias, apply) {
  console.table(Object.fromEntries(Object.entries(ESPERADOS).map(([entidade, planejados]) => [entidade, {
    planejados,
    [apply ? 'criados' : 'a criar']: plano.filter((p) => p.entidade === entidade && (apply ? criados.has(p.id) : !existentes.has(p.id) && !pendencias.has(p.id))).length,
    reutilizados: plano.filter((p) => p.entidade === entidade && existentes.has(p.id)).length,
    'pendentes/conflitos': plano.filter((p) => p.entidade === entidade && pendencias.has(p.id)).length,
  }])));
  console.log('Usuários criados/alterados: 0. Dados fictícios; nenhuma chamada à IA ou envio externo.');
  for (const motivo of new Set(pendencias.values())) console.log(`Pendência: ${motivo}`);
  console.log('DEMO - Intermediário: rascunhos, enviados e arquivados. DEMO - Avançado: geração para seis alunos.');
  console.log('DEMO - Básico: quatro alunos com evidências e dois sem registros. DEMO - Semestre anterior: histórico 2026.1.');
}
async function aplicarPlano(plano, existentes, pendencias, diario, arquivo) {
  const criados = new Set(); const finalizados = new Set(); const mapa = new Map(existentes);
  const porId = new Map(plano.map((p) => [p.id, p]));
  for (const id of Object.keys(diario.pendentes)) exigir(porId.has(id), 'Registro local contém entidade fora do plano.');
  for (const item of plano) {
    if (pendencias.has(item.id) || existentes.has(item.id)) continue;
    // Releitura das dependências: não basta o estado observado no preflight.
    for (const dep of dependencias(item, porId)) {
      const doc = await modelos[dep.entidade].findById(dep.dados._id).lean();
      if (doc) { verificarEstrutura(dep, doc); mapa.set(dep.id, doc); } else mapa.delete(dep.id);
    }
    const motivo = motivoDependencia(item, mapa, pendencias, porId);
    if (motivo) { pendencias.set(item.id, motivo); continue; }
    const stamp = new Date();
    const doc = new modelos[item.entidade]({ ...item.dados, createdAt: stamp, updatedAt: stamp, __v: 0 });
    await doc.validate();
    const alvo = new modelos[item.entidade]({ ...doc.toObject(), ...item.final });
    await alvo.validate();
    // Write-ahead: se o processo parar logo depois do insert, a retomada pode
    // reconhecer o documento exato que esta execução pretendia criar.
    diario.pendentes[item.id] = { inicial: assinatura(doc), final: assinatura(alvo, true) };
    gravarDiario(arquivo, diario);
    try {
      await doc.save();
      criados.add(item.id); mapa.set(item.id, doc.toObject());
      if (!diario.criados.includes(item.id)) diario.criados.push(item.id);
      diario.pendentes[item.id].inicial = assinatura(doc);
      gravarDiario(arquivo, diario);
    } catch (erro) {
      if (![11000, 11001].includes(erro.code)) throw erro;
      const concorrente = await modelos[item.entidade].findById(item.dados._id).lean();
      if (concorrente) {
        verificarEstrutura(item, concorrente); existentes.set(item.id, concorrente); mapa.set(item.id, concorrente);
        // Foi criado por outra execução: nunca aplicar nossos estados sobre ele.
        delete diario.pendentes[item.id]; gravarDiario(arquivo, diario);
      } else {
        pendencias.set(item.id, 'Conflito de índice durante a criação; dependentes ficam pendentes.');
        delete diario.pendentes[item.id]; gravarDiario(arquivo, diario);
      }
    }
  }
  // Encerramento da estrutura somente depois de construir registros e feedbacks.
  const ordem = ['Feedback', 'RegistroDiario', 'Aula', 'Matricula', 'Aluno', 'Turma'];
  for (const entidade of ordem) for (const item of plano.filter((p) => p.entidade === entidade && diario.pendentes[p.id])) {
    const doc = await modelos[entidade].findById(item.dados._id);
    if (!doc) { pendencias.set(item.id, 'Criação não confirmada; retomar em outra execução.'); continue; }
    verificarEstrutura(item, doc);
    const etapa = diario.pendentes[item.id];
    if (assinatura(doc, true) === etapa.final) {
      delete diario.pendentes[item.id]; gravarDiario(arquivo, diario); continue;
    }
    if (assinatura(doc) !== etapa.inicial) {
      pendencias.set(item.id, 'Documento pendente foi modificado; alteração do professor preservada.'); continue;
    }
    // Não encerrar uma estrutura da qual ainda faltam descendentes do plano.
    const dependentePendente = plano.some((p) => pendencias.has(p.id)
      && dependencias(p, porId).some((dep) => dep.id === item.id));
    if (dependentePendente) { pendencias.set(item.id, 'Finalização adiada enquanto houver dependentes pendentes.'); continue; }
    // save() com condição do snapshot protege inclusive alterações concorrentes
    // que não passam pelos timestamps; hooks e validação continuam habilitados.
    const snapshot = doc.toObject();
    doc.$where = Object.fromEntries(Object.entries(snapshot).filter(([k]) => k !== '_id'));
    for (const campo of Object.keys(modelos[entidade].schema.paths)) {
      if (!campo.includes('.') && !(campo in snapshot)) doc.$where[campo] = { $exists: false };
    }
    Object.assign(doc, item.final);
    try { await doc.save(); }
    catch (erro) {
      if (erro.name === 'DocumentNotFoundError' || erro.name === 'VersionError' || [11000, 11001].includes(erro.code)) {
        pendencias.set(item.id, 'Estado mudou durante finalização; documento preservado.'); continue;
      }
      throw erro;
    }
    const salvo = await modelos[entidade].findById(item.dados._id).lean();
    exigir(salvo && assinatura(salvo, true) === etapa.final, 'Finalização não confirmada; execução parcial.');
    finalizados.add(item.id); delete diario.pendentes[item.id]; gravarDiario(arquivo, diario);
  }
  return { criados, finalizados };
}
async function conferir(plano, antes, finalizados, pendencias) {
  const depois = await carregar(plano);
  for (const item of plano) {
    if (!depois.has(item.id)) pendencias.set(item.id, pendencias.get(item.id) || 'Documento planejado ausente.');
    const antigo = antes.get(item.id);
    if (antigo && !finalizados.has(item.id) && assinatura(antigo) !== assinatura(depois.get(item.id) || {}))
      pendencias.set(item.id, 'Documento preexistente mudou durante a execução; verificar concorrência.');
  }
  if (!antes.size && !pendencias.size) {
    for (const item of plano) {
      const doc = depois.get(item.id);
      for (const campo of ['status', 'statusEnvio', 'geradoPorIA']) if (campo in item.dados)
        exigir(doc[campo] === (item.final[campo] ?? item.dados[campo]), 'Distribuição final diferente do plano.');
      if (item.entidade === 'Feedback') exigir(doc.textoIAOriginal === undefined && doc.geradoEm === undefined, 'Origem manual inconsistente.');
      if (item.entidade === 'RegistroDiario') exigir(doc.mensagemIAOriginal === undefined && doc.mensagemEditada === undefined && doc.geradaEm === undefined, 'Mensagem diária inesperada.');
    }
  }
  const alunosSemMatricula = plano.filter((p) => p.entidade === 'Aluno' && /^A(19|2[0-4])$/.test(p.chave)).map((p) => p.dados._id);
  const semEvidencias = plano.filter((p) => p.entidade === 'Matricula' && [17, 18].includes(p.numero)).map((p) => p.dados._id);
  const avancado = plano.filter((p) => p.entidade === 'Matricula' && !p.historico && p.numero >= 7 && p.numero <= 12).map((p) => p.dados._id);
  const verificacoes = [
    await modelos.Matricula.countDocuments({ alunoId: { $in: alunosSemMatricula } }),
    await modelos.RegistroDiario.countDocuments({ matriculaId: { $in: semEvidencias } }),
    await modelos.Feedback.countDocuments({ matriculaId: { $in: avancado } }),
  ];
  const comEvidencias = await modelos.RegistroDiario.distinct('matriculaId', { matriculaId: { $in: avancado }, status: 'ativo' });
  if (!antes.size && !pendencias.size) exigir(verificacoes.every((n) => n === 0) && comEvidencias.length === 6, 'Cenários consultados não correspondem à primeira carga.');
  console.log(`Conferência: A19–A24 com ${verificacoes[0]} matrícula(s); A17/A18 com ${verificacoes[1]} registro(s); Avançado com ${comEvidencias.length} alunos com evidências e ${verificacoes[2]} feedback(s).`);
  return depois;
}
async function main() {
  let liberar; let plano; let existentes; let pendencias; let resultado; let apply = false;
  try {
    const opcoes = argumentos(process.argv.slice(2));
    if (opcoes.help) {
      console.log('Dados fictícios, sem IA. Sem modo: simulação. Execute na raiz:');
      console.log('node scripts/popular-demo.js --dry-run --professor-email professor.demo@example.com');
      console.log('node scripts/popular-demo.js --apply --professor-email professor.demo@example.com'); return;
    }
    apply = opcoes.apply;
    execFileSync('git', ['check-ignore', '--quiet', 'node_modules/.cache/devclass-demo-v1/estado.json'], { cwd: RAIZ, stdio: 'ignore' });
    // Carrega somente a URI em memória; não importa server.js e não registra valores.
    const dotenv = require('dotenv');
    const envPath = path.join(RAIZ, '.env');
    const uri = process.env.MONGODB_URI || (fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)).MONGODB_URI : undefined);
    exigir(typeof uri === 'string' && uri.trim(), 'MONGODB_URI não configurada. Nenhuma gravação realizada.');
    try {
      await mongoose.connect(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 });
    } catch {
      throw new FalhaControlada('Não foi possível conectar ao MongoDB. Confira rede, permissão de IP e configuração local; nenhum segredo foi registrado.');
    }
    const professor = await Usuario.findOne({ email: opcoes.email }).select('_id email perfil ativo').lean();
    exigir(professor && professor.perfil === 'professor' && professor.ativo === true, 'Professor existente não encontrado, inativo ou com perfil incompatível. Nenhuma gravação realizada.');
    plano = montarPlano(professor._id); await validarPlano(plano);
    console.log('Plano completo validado em memória: 200 documentos, relações, contagens e hooks dos modelos.');
    const arquivo = path.join(CACHE, `${hash(`${mongoose.connection.name}|${professor._id}`).slice(0, 24)}.json`);
    if (apply) { fs.mkdirSync(CACHE, { recursive: true, mode: 0o700 }); liberar = bloquearLocal(`${arquivo}.lock`); }
    const diario = lerDiario(arquivo, professor._id);
    const inventarioAntes = await inventario();
    existentes = await carregar(plano);
    const antes = new Map(existentes);
    pendencias = await preparar(plano, existentes);
    const faltas = indicesAusentes(inventarioAntes);
    if (faltas.length) {
      faltas.forEach((falta) => console.log(`Pendência: ${falta}. Nenhum índice será criado/reconstruído.`));
      for (const item of plano) if (!existentes.has(item.id)) pendencias.set(item.id, 'Índices esperados ausentes; gravação bloqueada.');
      resumo(plano, existentes, new Set(), pendencias, apply);
      throw new FalhaControlada('Corrigir os índices por um procedimento separado antes de povoar.');
    }
    if (!apply) {
      // A simulação também relata retomadas pendentes sem alterar o diário.
      for (const [id, etapa] of Object.entries(diario.pendentes)) {
        const doc = existentes.get(id);
        if (doc && assinatura(doc) !== etapa.inicial && assinatura(doc, true) !== etapa.final)
          pendencias.set(id, 'Documento pendente modificado; finalização não será imposta.');
      }
      const inventarioDepois = await inventario();
      const lidosDepois = await carregar(plano);
      exigir(assinatura(inventarioAntes) === assinatura(inventarioDepois)
        && assinatura(Object.fromEntries(existentes)) === assinatura(Object.fromEntries(lidosDepois)),
      'Estado do banco mudou durante a simulação; confira concorrência antes de aplicar.');
      resumo(plano, existentes, new Set(), pendencias, false);
      console.log('Simulação: nenhuma gravação. Coleções, índices, contagens e documentos do conjunto permaneceram iguais.');
    } else {
      resultado = await aplicarPlano(plano, existentes, pendencias, diario, arquivo);
      await conferir(plano, antes, resultado.finalizados, pendencias);
      resumo(plano, existentes, resultado.criados, pendencias, true);
      console.log(`Finalizações realizadas: ${resultado.finalizados.size}. Etapas locais pendentes: ${Object.keys(diario.pendentes).length}.`);
      if (!antes.size && !pendencias.size) console.log('Distribuição conferida: aulas 15 ativas/9 arquivadas; registros 88 ativos/12 arquivados; feedbacks 6 rascunhos ativos/6 enviados ativos/6 arquivados.');
      if (antes.size === plano.length && !resultado.criados.size && !resultado.finalizados.size && !pendencias.size)
        console.log('Idempotência conferida: zero inserções e zero mudanças nos documentos existentes.');
    }
    if (pendencias.size) throw new FalhaControlada('Execução incompleta: pendências preservadas, sem limpeza ou sobrescrita.');
  } catch (erro) {
    // Nunca imprimir erro bruto do driver, stack, URI ou documentos.
    console.error(erro instanceof FalhaControlada ? erro.message :
      erro.name === 'ValidationError' || erro.code === 'ERR_ASSERTION' ? 'Plano/resultado inválido; validação interrompeu a execução.'
        : 'Execução interrompida por falha operacional. Dados já criados foram preservados; use a simulação para conferir e retomar.');
    if (apply && plano && existentes && pendencias && !resultado) {
      try {
        const depois = await carregar(plano);
        const criados = new Set([...depois.keys()].filter((id) => !existentes.has(id)));
        for (const p of plano) if (!depois.has(p.id)) pendencias.set(p.id, 'Ausente após execução parcial.');
        resumo(plano, existentes, criados, pendencias, true);
      } catch { console.error('Não foi possível conferir o resultado parcial por consulta.'); }
    }
    process.exitCode = 1;
  } finally {
    try { if (liberar) liberar(); } catch { console.error('Não foi possível liberar a trava local.'); process.exitCode = 1; }
    try { await mongoose.disconnect(); } catch { console.error('Falha ao encerrar a conexão.'); process.exitCode = 1; }
  }
}
if (require.main === module) main();
module.exports = { argumentos, montarPlano, validarPlano };
