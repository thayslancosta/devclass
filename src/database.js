const mongoose = require('mongoose');

async function conectarBanco() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[database] MongoDB conectado com sucesso.');
}

module.exports = conectarBanco;
