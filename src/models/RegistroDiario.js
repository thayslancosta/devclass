const mongoose = require('mongoose');

const avaliacaoSchema = new mongoose.Schema(
  {
    habilidade: {
      type: String,
      required: true,
      enum: [
        'speaking',
        'listening',
        'reading',
        'writing',
        'grammar',
        'vocabulary',
        'pronunciation',
        'participation',
        'outra',
      ],
    },

    desempenho: {
      type: String,
      required: true,
      enum: ['destaque', 'adequado', 'precisa_de_atencao'],
    },

    observacao: {
      type: String,
      trim: true,
    },

    outraDescricao: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const registroDiarioSchema = new mongoose.Schema(
  {
    aulaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Aula',
      required: true,
    },

    matriculaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Matricula',
      required: true,
    },

    observacaoGeral: {
      type: String,
      trim: true,
    },

    avaliacoes: {
      type: [avaliacaoSchema],
      default: [],
    },

    mensagemIAOriginal: {
      type: String,
      trim: true,
    },

    mensagemEditada: {
      type: String,
      trim: true,
    },

    geradaEm: {
      type: Date,
    },

    status: {
      type: String,
      enum: ['ativo', 'arquivado'],
      default: 'ativo',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RegistroDiario', registroDiarioSchema);