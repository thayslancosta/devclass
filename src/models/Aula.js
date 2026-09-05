const mongoose = require('mongoose');

const aulaSchema = new mongoose.Schema(
  {
    turmaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turma',
      required: true,
    },

    data: {
      type: Date,
      required: true,
    },

    topicos: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ['ativa', 'arquivada'],
      default: 'ativa',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Aula', aulaSchema);