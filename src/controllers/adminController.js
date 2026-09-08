const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const { ErroApi } = require('../utils/erros');

const PERFIS_VALIDOS = ['professor', 'admin'];

async function listarUsuarios(req, res, next) {
  try {
    const filtro = {};
    if (req.query.perfil) {
      if (!PERFIS_VALIDOS.includes(req.query.perfil)) {
        throw new ErroApi(400, "Perfil inválido. Use 'professor' ou 'admin'.");
      }
      filtro.perfil = req.query.perfil;
    }

    if (req.query.ativo !== undefined) {
      if (!['true', 'false'].includes(req.query.ativo)) {
        throw new ErroApi(400, 'O filtro "ativo" deve ser true ou false.');
      }
      filtro.ativo = req.query.ativo === 'true';
    }

    // select:false já esconde a senha por padrão nas queries normais
    const usuarios = await Usuario.find(filtro).sort({ createdAt: -1 });
    return res.status(200).json(usuarios);
  } catch (err) {
    next(err);
  }
}

async function alterarStatusUsuario(req, res, next) {
  try {
    const { id } = req.params;
    const { ativo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErroApi(400, 'ID de usuário inválido.');
    }

    if (typeof ativo !== 'boolean') {
      throw new ErroApi(400, 'Campo "ativo" deve ser booleano.');
    }

    const usuario = await Usuario.findByIdAndUpdate(
      id,
      { ativo },
      { new: true }
    );

    if (!usuario) throw new ErroApi(404, 'Usuário não encontrado.');

    return res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
}

module.exports = { listarUsuarios, alterarStatusUsuario };
