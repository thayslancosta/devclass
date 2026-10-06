// Sem servidor, banco ou IA: node --test tests/feedbacks.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { createRequire } = require('node:module');
const { mkdtempSync, writeFileSync, rmSync, readdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const frontend = path.resolve(__dirname, '..');
const temporario = mkdtempSync(path.join(tmpdir(), 'devclass-feedbacks-'));
const arquivo = path.join(temporario, 'feedbacks.cjs');
const compilado = buildSync({
  stdin: {
    contents: `
      export * from './src/features/feedbacks/sequenciaFeedbacks';
      export * as operacoes from './src/graphql/feedbacks';
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import Editor from './src/features/feedbacks/FeedbackEditor';
      export const renderEditor = props => renderToStaticMarkup(React.createElement(Editor, props));
    `,
    resolveDir: frontend,
  },
  bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false,
});
writeFileSync(arquivo, compilado.outputFiles[0].text);
const { executarSequencia, operacoes, renderEditor } = require(arquivo);
rmSync(temporario, { recursive: true, force: true });

const erro = (code) => ({ errors: [{ message: code, extensions: { code } }] });

test('documentos de feedback são válidos contra os typeDefs atuais do backend', () => {
  const backendRequire = createRequire(path.join(frontend, '..', 'package.json'));
  const { buildASTSchema, concatAST, parse, validate } = backendRequire('graphql');
  const pasta = path.join(frontend, '..', 'src/graphql/typeDefs');
  const tipos = readdirSync(pasta).filter((nome) => nome.endsWith('.js')).map((nome) => backendRequire(path.join(pasta, nome)));
  const schema = buildASTSchema(concatAST([parse('type Query { health: String! }'), ...tipos]));
  for (const [nome, documento] of Object.entries(operacoes)) {
    assert.deepEqual(validate(schema, documento).map((e) => e.message), [], nome);
  }
});

test('uma chamada por vez, ordem preservada e progresso individual', async () => {
  let simultaneas = 0;
  const chamadas = [];
  const resultados = {};
  await executarSequencia({
    ids: ['matricula-a', 'matricula-b'], continua: () => true,
    gerar: async (id) => {
      simultaneas++;
      assert.equal(simultaneas, 1);
      chamadas.push(id);
      await new Promise((resolve) => setImmediate(resolve));
      simultaneas--;
    },
    atualizar: async (id) => chamadas.push(`consulta:${id}`),
    resultado: (id, valor) => { (resultados[id] ||= []).push(valor.estado); },
  });
  assert.deepEqual(chamadas, ['matricula-a', 'consulta:matricula-a', 'matricula-b', 'consulta:matricula-b']);
  assert.deepEqual(resultados, { 'matricula-a': ['Gerando', 'Concluído'], 'matricula-b': ['Gerando', 'Concluído'] });
});

for (const code of ['BAD_USER_INPUT', 'CONFLICT', 'NOT_FOUND']) {
  test(`erro individual ${code} preserva falha e segue sem repetir`, async () => {
    const chamadas = [];
    const resultados = {};
    await executarSequencia({
      ids: ['a', 'b'], continua: () => true,
      gerar: async (id) => { chamadas.push(id); if (id === 'a') throw erro(code); },
      atualizar: async () => {}, resultado: (id, valor) => { resultados[id] = valor.estado; },
    });
    assert.deepEqual(chamadas, ['a', 'b']);
    assert.deepEqual(resultados, { a: 'Falha', b: 'Concluído' });
  });
}

for (const code of ['UNAUTHENTICATED', 'FORBIDDEN', 'IA_NOT_CONFIGURED', 'IA_UNAVAILABLE', 'INTERNAL_SERVER_ERROR', 'DESCONHECIDO', 'REDE']) {
  test(`${code} interrompe próximos alunos e reconcilia sem retentar mutation`, async () => {
    const chamadas = [];
    const consultas = [];
    const resultados = {};
    await executarSequencia({
      ids: ['a', 'b', 'c'], continua: () => true,
      gerar: async (id) => { chamadas.push(id); if (id === 'b') throw code === 'REDE' ? new Error('Conexão perdida') : erro(code); },
      atualizar: async (id) => { consultas.push(id); }, resultado: (id, valor) => { resultados[id] = valor.estado; },
    });
    assert.deepEqual(chamadas, ['a', 'b']);
    assert.deepEqual(consultas, ['a', 'b']);
    assert.deepEqual(resultados, { a: 'Concluído', b: 'Falha', c: 'Interrompido' });
  });
}

test('falha na consulta após sucesso não comunica falha de geração nem segue', async () => {
  const chamadas = [];
  const resultados = {};
  await executarSequencia({
    ids: ['a', 'b'], continua: () => true, gerar: async (id) => { chamadas.push(id); },
    atualizar: async () => { throw new Error('Offline'); }, resultado: (id, valor) => { resultados[id] = valor; },
  });
  assert.deepEqual(chamadas, ['a']);
  assert.equal(resultados.a.estado, 'Concluído');
  assert.match(resultados.a.mensagem, /consulta falhou/);
  assert.equal(resultados.b.estado, 'Interrompido');
});

test('sair durante uma chamada impede a geração dos próximos alunos', async () => {
  let montado = true;
  const chamadas = [];
  await executarSequencia({
    ids: ['a', 'b'], continua: () => montado,
    gerar: async (id) => { chamadas.push(id); montado = false; },
    atualizar: async () => assert.fail('Não consultar após sair'), resultado: () => {},
  });
  assert.deepEqual(chamadas, ['a']);
});

const feedback = { id: 'teste', tipo: 'parcial', status: 'ativo', statusEnvio: 'rascunho', textoEditado: 'Texto salvo' };
test('feedback enviado ou arquivado bloqueia edição e regeneração; cópia permanece', () => {
  for (const estado of [{ statusEnvio: 'enviado' }, { status: 'arquivado' }]) {
    const html = renderEditor({ feedback: { ...feedback, ...estado }, texto: 'Texto salvo', sujo: false });
    assert.match(html, /readonly=""/);
    assert.doesNotMatch(html, />Salvar alterações</);
    assert.doesNotMatch(html, />Regenerar com IA</);
    assert.match(html, />Copiar texto</);
  }
});

test('rascunho local bloqueia marcar envio e arquivar, mantendo revisão e original', () => {
  const html = renderEditor({ feedback: { ...feedback, textoIAOriginal: 'Original preservado' }, texto: 'Revisado', sujo: true });
  assert.match(html, /<button[^>]*disabled=""[^>]*>Marcar como enviado<\/button>/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Arquivar<\/button>/);
  assert.match(html, /<details><summary>Ver texto original<\/summary>/);
  assert.match(html, /Original preservado/);
});
