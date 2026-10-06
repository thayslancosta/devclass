// API em memória: nenhum acesso ao servidor, banco ou IA.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const pasta = mkdtempSync(path.join(tmpdir(), 'devclass-fluxos-'));
const arquivo = path.join(pasta, 'fluxos.cjs');
writeFileSync(arquivo, buildSync({
  stdin: { resolveDir: path.resolve(__dirname, '..'), contents: `
    export * from './src/features/aulas/aulaEdicao';
    export * from './src/features/alunos/perfilContexto';
    export * from './src/features/feedbacks/feedbackUtils';
    import React from 'react';
    import { renderToString } from 'react-dom/server';
    import { MemoryRouter } from 'react-router-dom';
    import { ApolloClient, InMemoryCache, ApolloLink } from '@apollo/client';
    import { ApolloProvider } from '@apollo/client/react';
    import AulaForm from './src/features/aulas/AulaEdicaoForm';
    import FeedbacksArea from './src/features/feedbacks/FeedbacksArea';
    export function renderFluxo(componente, props) {
      const client = new ApolloClient({ cache: new InMemoryCache(), link: ApolloLink.empty() });
      return renderToString(React.createElement(MemoryRouter, null, React.createElement(ApolloProvider, { client },
        React.createElement(componente === 'aula' ? AulaForm : FeedbacksArea, props))));
    }
  ` }, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false,
  loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"production"' },
}).outputFiles[0].text);
const f = require(arquivo);
rmSync(pasta, { recursive: true, force: true });
const turma = { id: 't', nome: 'Turma', periodoLetivo: '2026.2', status: 'ativa' };
const itens = [1, 2, 3].map((n) => ({ aluno: { id: `aluno${n}`, nome: `Aluno ${n}`, status: 'ativo' }, matricula: { id: `m${n}`, turmaId: 't', periodoLetivo: '2026.2', status: 'ativa' } }));
const aula = { id: 'a1', turmaId: 't', data: '2026-09-10', topicos: [], status: 'ativa' };
const clone = (v) => structuredClone(v);
function erro(code) { return { errors: [{ message: code, extensions: { code } }] }; }
function apiMock() {
  const db = { aulas: [], registros: [] }; const chamadas = [];
  const api = {
    aulas: async () => clone(db.aulas),
    registros: async (id) => clone(db.registros.filter((r) => r.matriculaId === id)),
    criarAula: async (input) => {
      chamadas.push(['criarAula', clone(input)]);
      const salva = { ...input, id: 'a1', status: 'ativa', topicos: input.topicos || [] }; db.aulas.push(salva); return clone(salva);
    },
    atualizarAula: async (id, input) => {
      chamadas.push(['atualizarAula', id, clone(input)]);
      const salva = db.aulas.find((a) => a.id === id); Object.assign(salva, input); return clone(salva);
    },
    adicionarRegistro: async (input) => {
      chamadas.push(['adicionarRegistro', clone(input)]);
      const salvo = { ...input, id: `r-${input.matriculaId}`, status: 'ativo' }; db.registros.push(salvo); return clone(salvo);
    },
    atualizarRegistro: async (id, input) => {
      chamadas.push(['atualizarRegistro', id, clone(input)]);
      const salvo = db.registros.find((r) => r.id === id); Object.assign(salvo, input); return clone(salvo);
    },
  };
  return { db, chamadas, api };
}
function estado(a = null) { const s = f.criarEdicao(turma, a, itens); s.data = '2026-09-10'; return s; }
function escrever(s, id, texto) { s.linhas[id].rascunho.observacaoGeral = texto; }
async function carregar(s, api) { for (const id of Object.keys(s.linhas)) await f.consultarLinha(s, id, api); }

test('perfil respeita matrícula explícita, aba e semestre; contexto inválido não consulta outro', () => {
  const matriculas = [{ id: 'atual', periodoLetivo: '2026.2' }, { id: 'antiga', periodoLetivo: '2026.1' }];
  assert.equal(f.contextoPerfil(matriculas, new URLSearchParams(), '2026.2').aba, 'registros');
  const c = f.contextoPerfil(matriculas, new URLSearchParams('matricula=antiga&aba=feedbacks'), '2026.2');
  assert.equal(c.selecionada.id, 'antiga'); assert.equal(c.aba, 'feedbacks');
  assert.equal(f.contextoPerfil(matriculas, new URLSearchParams('matricula=fora'), '2026.2').selecionada, null);
  assert.equal(f.contextoPerfil(matriculas, new URLSearchParams('feedback=f1'), '2026.2').aba, 'feedbacks');
  assert.equal(f.contextoPerfil([matriculas[1]], new URLSearchParams(), '2026.2').historicoImplicito, true);
});
test('filtro de feedback não implica ausência de ativo e separa históricos do tipo único', () => {
  const enviado = { id: '1', tipo: 'parcial', status: 'ativo', statusEnvio: 'enviado' };
  const arquivado = { id: '2', tipo: 'parcial', status: 'arquivado', statusEnvio: 'rascunho' };
  const final = { id: '3', tipo: 'final', status: 'ativo', statusEnvio: 'rascunho' };
  const v = f.visaoFeedbacks([enviado, arquivado, final], 'parcial', 'rascunho', true);
  assert.equal(v.ativo, enviado); assert.equal(v.ativoVisivel, false); assert.deepEqual(v.historicos, [arquivado]);
  assert.equal(f.visaoFeedbacks([arquivado], 'parcial', 'todos', true).ativo, undefined);
  assert.deepEqual(f.visaoFeedbacks([enviado, arquivado, final], 'final', 'todos', true).historicos, []);
});
test('data padrão usa calendário local quando UTC já está no dia seguinte', () => {
  const anterior = process.env.TZ; process.env.TZ = 'America/Fortaleza';
  try { assert.equal(f.hojeLocal(new Date('2026-10-06T01:30:00Z')), '2026-10-05'); }
  finally { if (anterior === undefined) delete process.env.TZ; else process.env.TZ = anterior; }
});
test('formulário renderiza alunos/tópicos opcionais e feedbacks têm um único tipo principal', () => {
  const html = f.renderFluxo('aula', { turma, aula: null, itens });
  assert.match(html, /Nova aula/); assert.match(html, /Como foi nesta aula/); assert.match(html, /Tópicos da aula — opcional/);
  const feedbacks = f.renderFluxo('feedback', { itens });
  assert.match(feedbacks, />Tipo<\/label>/); assert.doesNotMatch(feedbacks, /Mostrar tipo|Tipo para criar ou gerar|Atualizar consulta/);
});
test('aula sem tópicos/observações salva só a aula; somente avaliações é válido', async () => {
  const { api, chamadas } = apiMock(); const s = estado(); await f.salvarEdicao(s, api);
  assert.deepEqual(chamadas.map((c) => c[0]), ['criarAula']); assert.match(s.info, /nenhuma observação/);
  s.linhas.m1.rascunho.avaliacoes = [{ habilidade: 'speaking', desempenho: 'adequado' }]; await f.salvarEdicao(s, api);
  assert.equal(chamadas.filter((c) => c[0] === 'adicionarRegistro').length, 1); assert.equal(s.linhas.m1.registro.matriculaId, 'm1');
});
test('qualquer registro inválido impede todas as gravações e identifica o aluno', async () => {
  const { api, chamadas } = apiMock(); const s = estado(); escrever(s, 'm1', 'Válido');
  s.linhas.m2.rascunho.avaliacoes = [{ habilidade: 'outra', desempenho: 'adequado', outraDescricao: '' }];
  await f.salvarEdicao(s, api);
  assert.equal(chamadas.length, 0); assert.match(s.linhas.m2.erro, /Aluno 2/); assert.equal(s.linhas.m1.rascunho.observacaoGeral, 'Válido');
  s.linhas.m2.rascunho.avaliacoes = []; s.data = '2026-03-10'; await f.salvarEdicao(s, api);
  assert.equal(chamadas.length, 0); assert.match(s.erro, /semestre/);
});
test('somente novos/alterados são enviados; IDs retidos e esvaziamento não arquiva implicitamente', async () => {
  const { api, chamadas } = apiMock(); const s = estado(); escrever(s, 'm1', 'Primeiro'); escrever(s, 'm2', 'Segundo');
  await f.salvarEdicao(s, api); assert.equal(s.aula.id, 'a1'); assert.equal(s.linhas.m1.registro.id, 'r-m1');
  escrever(s, 'm1', 'Revisado'); escrever(s, 'm3', 'Terceiro'); await f.salvarEdicao(s, api);
  assert.equal(chamadas.filter((c) => c[0] === 'criarAula').length, 1);
  assert.equal(chamadas.filter((c) => c[0] === 'adicionarRegistro').length, 3);
  assert.equal(chamadas.filter((c) => c[0] === 'atualizarRegistro').length, 1);
  const antes = chamadas.length; escrever(s, 'm2', ''); await f.salvarEdicao(s, api);
  assert.equal(chamadas.length, antes); assert.match(s.linhas.m2.erro, /Arquivar/);
});
test('falha da aula bloqueia registros e clique duplo não duplica criação', async () => {
  const { api, chamadas } = apiMock(); const s = estado(); escrever(s, 'm1', 'Texto');
  api.criarAula = async () => { chamadas.push(['falhou']); throw erro('BAD_USER_INPUT'); };
  await Promise.all([f.salvarEdicao(s, api), f.salvarEdicao(s, api)]);
  assert.deepEqual(chamadas, [['falhou']]); assert.equal(s.aula, null); assert.equal(s.linhas.m1.rascunho.observacaoGeral, 'Texto');
});
test('falha parcial conserva aula/textos; retry não reenvia o aluno salvo', async () => {
  const { api, chamadas } = apiMock(); const s = estado(); escrever(s, 'm1', 'Um'); escrever(s, 'm2', 'Dois');
  const adicionar = api.adicionarRegistro; let falhar = true;
  api.adicionarRegistro = async (input) => { if (input.matriculaId === 'm2' && falhar) { falhar = false; throw erro('BAD_USER_INPUT'); } return adicionar(input); };
  await f.salvarEdicao(s, api);
  assert.equal(s.aula.id, 'a1'); assert.equal(s.linhas.m1.registro.id, 'r-m1'); assert.equal(s.linhas.m2.rascunho.observacaoGeral, 'Dois');
  assert.match(s.info, /pendências/); await f.salvarEdicao(s, api);
  assert.equal(chamadas.filter((c) => c[0] === 'criarAula').length, 1);
  assert.equal(chamadas.filter((c) => c[0] === 'adicionarRegistro' && c[1].matriculaId === 'm1').length, 1);
  assert.equal(s.linhas.m2.registro.id, 'r-m2');
});
test('aula duplicada exige abertura explícita e escolha da versão por aluno', async () => {
  const { api, chamadas, db } = apiMock(); db.aulas.push(clone(aula));
  db.registros.push({ id: 'remoto', aulaId: 'a1', matriculaId: 'm1', status: 'ativo', observacaoGeral: 'Texto salvo', avaliacoes: [] });
  const s = estado(); escrever(s, 'm1', 'Rascunho'); escrever(s, 'm2', 'Novo texto');
  await f.salvarEdicao(s, api); assert.equal(chamadas.length, 0); assert.equal(s.conflitoAula.id, 'a1');
  await f.abrirAulaEncontrada(s, s.conflitoAula, api);
  assert.equal(s.linhas.m1.rascunho.observacaoGeral, 'Rascunho'); assert.equal(s.linhas.m1.conflito.remoto.id, 'remoto');
  assert.equal(s.linhas.m2.rascunho.observacaoGeral, 'Novo texto'); f.resolverRegistro(s.linhas.m1, true); await f.salvarEdicao(s, api);
  assert.equal(chamadas.filter((c) => c[0] === 'criarAula').length, 0); assert.equal(chamadas.find((c) => c[0] === 'atualizarRegistro')[1], 'remoto');
});
test('resposta perdida ao criar aula é reconciliada antes de tentar os registros', async () => {
  const { api, chamadas } = apiMock(); const s = estado(); escrever(s, 'm1', 'Texto');
  const criar = api.criarAula; api.criarAula = async (input) => { await criar(input); throw new Error('Resposta perdida'); };
  await f.salvarEdicao(s, api); assert.equal(s.aula.id, 'a1'); assert.equal(s.linhas.m1.registro, null); await f.salvarEdicao(s, api);
  assert.equal(chamadas.filter((c) => c[0] === 'criarAula').length, 1); assert.equal(s.linhas.m1.registro.id, 'r-m1');
});
test('resposta perdida de registro reconhece conteúdo igual e não reenvia', async () => {
  const { api, chamadas } = apiMock(); const s = estado(); escrever(s, 'm1', 'Texto');
  const adicionar = api.adicionarRegistro; api.adicionarRegistro = async (input) => { await adicionar(input); throw new Error('Resposta perdida'); };
  await f.salvarEdicao(s, api); await f.salvarEdicao(s, api);
  assert.equal(s.linhas.m1.registro.id, 'r-m1'); assert.equal(f.linhaAlterada(s.linhas.m1), false);
  assert.equal(chamadas.filter((c) => c[0] === 'adicionarRegistro').length, 1);
});
test('resposta incerta divergente vira conflito e conserva o rascunho', async () => {
  const { api, chamadas, db } = apiMock(); const s = estado(); escrever(s, 'm1', 'Meu texto');
  const adicionar = api.adicionarRegistro;
  api.adicionarRegistro = async (input) => { await adicionar(input); db.registros[0].observacaoGeral = 'Outra edição'; throw new Error('Resposta perdida'); };
  await f.salvarEdicao(s, api); await f.salvarEdicao(s, api);
  assert.equal(s.linhas.m1.rascunho.observacaoGeral, 'Meu texto'); assert.equal(s.linhas.m1.conflito.remoto.observacaoGeral, 'Outra edição');
  assert.equal(chamadas.filter((c) => c[0] === 'adicionarRegistro').length, 1); assert.equal(chamadas.filter((c) => c[0] === 'atualizarRegistro').length, 0);
});
test('consulta falha não vira ausência; refetch conserva rascunhos', async () => {
  const { api, chamadas, db } = apiMock(); db.aulas.push(clone(aula)); const s = estado(aula);
  const registros = api.registros; api.registros = async (id) => { if (id === 'm1') throw new Error('Offline'); return registros(id); };
  await carregar(s, api); escrever(s, 'm2', 'Rascunho preservado'); await f.consultarLinha(s, 'm2', api);
  assert.equal(s.linhas.m2.rascunho.observacaoGeral, 'Rascunho preservado'); assert.equal(s.linhas.m1.conhecido, false);
  await f.salvarEdicao(s, api);
  assert.equal(chamadas.some((c) => c[0] === 'adicionarRegistro' && c[1].matriculaId === 'm1'), false);
  assert.equal(s.linhas.m2.registro.id, 'r-m2'); assert.match(s.info, /pendências/);
});
test('edição da data mantém aula original e envia tópicos só quando alterados', async () => {
  const { api, chamadas, db } = apiMock(); db.aulas.push({ ...aula, topicos: ['Preservado'] }); const s = estado(db.aulas[0]);
  await carregar(s, api); s.data = '2026-09-11'; await f.salvarEdicao(s, api);
  assert.equal(s.aula.id, 'a1'); assert.deepEqual(chamadas[0], ['atualizarAula', 'a1', { data: '2026-09-11' }]);
  db.aulas.push({ ...aula, id: 'ocupada', data: '2026-09-12' }); api.atualizarAula = async () => { throw erro('CONFLICT'); };
  s.data = '2026-09-12'; await f.salvarEdicao(s, api);
  assert.equal(s.aula.id, 'a1'); assert.equal(s.conflitoAula.id, 'ocupada'); assert.equal(s.aulaSalva.data, '2026-09-11');
});

test('abrir aula existente e recuperar consulta falha mantém rascunho e exige resolver texto divergente', async () => {
  const { api, db } = apiMock(); db.aulas.push(clone(aula));
  db.registros.push({ id: 'remoto', aulaId: 'a1', matriculaId: 'm1', status: 'ativo', observacaoGeral: 'Do servidor', avaliacoes: [] });
  const s = estado(); escrever(s, 'm1', 'Meu rascunho'); const consultar = api.registros;
  api.registros = async () => { throw new Error('Offline'); };
  await f.abrirAulaEncontrada(s, aula, api);
  assert.equal(s.linhas.m1.conhecido, false); assert.equal(s.linhas.m1.rascunho.observacaoGeral, 'Meu rascunho');
  api.registros = consultar; await f.consultarLinha(s, 'm1', api);
  assert.equal(s.linhas.m1.rascunho.observacaoGeral, 'Meu rascunho'); assert.equal(s.linhas.m1.conflito.remoto.observacaoGeral, 'Do servidor');
});

test('encerramento após digitação não descarta rascunho nem anuncia sucesso integral', async () => {
  const { api, chamadas, db } = apiMock(); db.aulas.push(clone(aula)); const s = estado(aula); await carregar(s, api);
  escrever(s, 'm1', 'Edição pendente'); s.linhas.m1.matricula = { ...s.linhas.m1.matricula, status: 'encerrada' };
  await f.salvarEdicao(s, api);
  assert.equal(chamadas.length, 0); assert.match(s.linhas.m1.erro, /encerrada/); assert.equal(s.linhas.m1.rascunho.observacaoGeral, 'Edição pendente');
});
