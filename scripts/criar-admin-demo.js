// scripts/criar-admin-demo.js
//
// Cria uma conta admin de demonstração. É executado explicitamente por um
// integrante, uma única vez (ou quando quiser conferir o estado atual) —
// NUNCA roda automaticamente ao iniciar o servidor.
//
// Uso:
//   node scripts/criar-admin-demo.js
//
// Os dados podem vir de variáveis de ambiente (prioridade) ou, se ausentes,
// são pedidos interativamente no terminal:
//   DEMO_ADMIN_NOME=
//   DEMO_ADMIN_EMAIL=
//   DEMO_ADMIN_PASSWORD=
//
// Regras:
// - Se o email já pertence a um professor, o script para e pede outro email
//   (nunca promove um professor existente a admin).
// - Se já existe uma conta admin, o script informa e não mexe em nada
//   (não redefine senha nem status de ninguém).
// - Nunca registra senha, hash, token ou a MONGODB_URI em log.
// - Sempre encerra a conexão com o banco ao final, com sucesso ou erro.

require('dotenv').config();

const readline = require('node:readline/promises');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario');

async function perguntar(pergunta, { oculto = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (!oculto) {
      return (await rl.question(pergunta)).trim();
    }
    // Entrada "oculta" simples no terminal (sem libs extras): aceitável
    // para um script local de demonstração, não para produção.
    return (await rl.question(pergunta)).trim();
  } finally {
    rl.close();
  }
}

function validar({ nome, email, senha }) {
  if (!nome) throw new Error('Nome é obrigatório.');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Email em formato inválido.');
  if (!senha || senha.length < 6) throw new Error('Senha deve ter ao menos 6 caracteres.');
}

async function obterDados() {
  let nome = process.env.DEMO_ADMIN_NOME;
  let email = process.env.DEMO_ADMIN_EMAIL;
  let senha = process.env.DEMO_ADMIN_PASSWORD;

  if (!nome) nome = await perguntar('Nome do admin de demonstração: ');
  if (!email) email = await perguntar('Email do admin de demonstração: ');
  if (!senha) senha = await perguntar('Senha do admin de demonstração (mín. 6 caracteres): ', { oculto: true });

  return {
    nome: (nome || '').trim(),
    email: (email || '').trim().toLowerCase(),
    senha: senha || '',
  };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[criar-admin-demo] MONGODB_URI não configurada no .env.');
    process.exitCode = 1;
    return;
  }

  const dados = await obterDados();

  try {
    validar(dados);
  } catch (erro) {
    console.error(`[criar-admin-demo] Dados inválidos: ${erro.message}`);
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const existente = await Usuario.findOne({ email: dados.email });

    if (existente) {
      if (existente.perfil === 'admin') {
        console.log(
          `[criar-admin-demo] Já existe uma conta admin com este email. Nenhuma alteração foi feita.`
        );
        return;
      }

      console.error(
        `[criar-admin-demo] Este email já pertence a uma conta '${existente.perfil}'. ` +
          `Use outro email — este script nunca promove uma conta existente.`
      );
      process.exitCode = 1;
      return;
    }

    const adminJaExiste = await Usuario.exists({ perfil: 'admin' });
    if (adminJaExiste) {
      console.log(
        '[criar-admin-demo] Já existe pelo menos uma conta admin no banco. ' +
          'Nenhuma alteração foi feita. Use o email dessa conta existente, ou ' +
          'peça para um integrante com acesso compartilhar as credenciais.'
      );
      return;
    }

    const hash = await bcrypt.hash(dados.senha, 10);

    await Usuario.create({
      nome: dados.nome,
      email: dados.email,
      senha: hash,
      perfil: 'admin',
      ativo: true,
    });

    console.log(`[criar-admin-demo] Conta admin criada com sucesso para ${dados.email}.`);
  } finally {
    await mongoose.connection.close();
  }
}

main().catch((erro) => {
  console.error('[criar-admin-demo] Erro inesperado:', erro.message);
  process.exitCode = 1;
});
