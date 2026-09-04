const mongoose = require('mongoose');

const encontroSchema = new mongoose.Schema(
  {
    diaSemana: {
      type: String,
      required: true,
      enum: [
    'segunda',
     'terca',
     'quarta',
     'quinta',
     'sexta',
     'sabado',
     'domingo'
   ],
    },

    horario: {
      type: String,
      required: true,
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Horário deve estar no formato HH:mm.',
      ],
    },
  },
  {
    _id: false,
  }
);

const turmaSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },

    estagio: {
      type: String,
      required: true,
      trim: true,
    },

    periodoLetivo: {
      type: String,
      required: true,
      match: [
        /^\d{4}\.[12]$/,
        'Período letivo deve estar no formato AAAA.1 ou AAAA.2.',
      ],
    },

    encontros: {
      type: [encontroSchema],
      default: [],
    },

    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },

    status: {
      type: String,
      enum: ['ativa', 'encerrada'],
      default: 'ativa',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Turma', turmaSchema);