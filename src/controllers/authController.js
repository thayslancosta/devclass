const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { ErroApi } = require('../utils/erros');

async function registrar(req, res, next) {
  try {
    const { nome, email, senha } = req.body ?? {};

    if (typeof nome !== 'string' || !nome.trim()) {
      throw new ErroApi(400, 'Nome é obrigatório.');
    }
    if (typeof email !== 'string') {
      throw new ErroApi(400, 'Email em formato inválido.');
    }
    const emailNormalizado = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      throw new ErroApi(400, 'Email em formato inválido.');
    }
    if (typeof senha !== 'string' || senha.length < 6) {
      throw new ErroApi(400, 'Senha deve ter ao menos 6 caracteres.');
    }

    const existente = await Usuario.findOne({ email: emailNormalizado });
    if (existente) throw new ErroApi(409, 'Este email já está cadastrado.');

    const hash = await bcrypt.hash(senha, 10);

    // Cadastro público SEMPRE cria perfil "professor" - o cliente não pode escolher.
    const usuario = await Usuario.create({
      nome: nome.trim(),
      email: emailNormalizado,
      senha: hash,
      perfil: 'professor',
    });

    return res.status(201).json({
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
    });
  } catch (err) {
    // A consulta anterior melhora a mensagem no caso comum, mas o índice
    // único continua sendo a garantia contra dois cadastros simultâneos.
    if (err && err.code === 11000) {
      return next(new ErroApi(409, 'Este email já está cadastrado.'));
    }

    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, senha } = req.body ?? {};
    if (
      typeof email !== 'string' || !email.trim() ||
      typeof senha !== 'string' || !senha.length
    ) {
      throw new ErroApi(400, 'Email e senha são obrigatórios.');
    }

    const emailNormalizado = email.trim().toLowerCase();
    // +senha porque o schema tem select:false
    const usuario = await Usuario.findOne({ email: emailNormalizado }).select('+senha');

    // Mensagem genérica: nunca revelar se o email existe ou se a senha está errada.
    if (!usuario || !usuario.ativo) {
      throw new ErroApi(401, 'Email ou senha inválidos.');
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha);
    if (!senhaConfere) {
      throw new ErroApi(401, 'Email ou senha inválidos.');
    }

    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, perfil: usuario.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      token,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { registrar, login };
