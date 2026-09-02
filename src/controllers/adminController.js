const Usuario = require('../models/Usuario');
const { ErroApi } = require('../utils/erros');

async function listarUsuarios(req, res, next) {
  try {
    const filtro = {};
    if (req.query.perfil) filtro.perfil = req.query.perfil;
    if (req.query.ativo !== undefined) filtro.ativo = req.query.ativo === 'true';

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
