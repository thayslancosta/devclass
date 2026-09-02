const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { ErroApi } = require('../utils/erros');

// Valida o Bearer Token, confirma que o usuário existe e está ativo,
// e disponibiliza req.usuario (nunca confia apenas no payload do token).
async function autenticar(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ErroApi(401, 'Token não informado.');
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new ErroApi(401, 'Token inválido ou expirado.');
    }

    const usuario = await Usuario.findById(payload.id);
    if (!usuario || !usuario.ativo) {
      throw new ErroApi(401, 'Usuário inválido ou inativo.');
    }

    req.usuario = {
      id: usuario._id.toString(),
      email: usuario.email,
      perfil: usuario.perfil,
    };

    next();
  } catch (err) {
    next(err);
  }
}

// Recebe uma lista de perfis autorizados, ex: autorizar('admin')
function autorizar(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      return next(new ErroApi(403, 'Você não tem permissão para esta operação.'));
    }
    next();
  };
}

module.exports = { autenticar, autorizar };
