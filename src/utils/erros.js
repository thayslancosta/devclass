class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

// Middleware de erro final do Express: nunca deixa stacktrace ir pro cliente.
function tratadorDeErros(err, req, res, next) {
  if (err instanceof ErroApi) {
    return res.status(err.status).json({ mensagem: err.message });
  }
  console.error('[erro interno]', err);
  return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
}

module.exports = { ErroApi, tratadorDeErros };
