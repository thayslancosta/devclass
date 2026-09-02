const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Email em formato inválido.'],
    },
    senha: {
      type: String,
      required: true,
      select: false, // nunca vem por padrão nas consultas
    },
    perfil: {
      type: String,
      enum: ['professor', 'admin'],
      default: 'professor',
    },
    ativo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Garantia extra: mesmo se select:false falhar em algum ponto, nunca serializar a senha.
usuarioSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.senha;
    return ret;
  },
});

module.exports = mongoose.model('Usuario', usuarioSchema);
