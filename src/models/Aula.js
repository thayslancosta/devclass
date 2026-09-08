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
      set: (topicos) => {
        if (!Array.isArray(topicos)) return topicos;

        return [
          ...new Set(
            topicos
              .filter((topico) => typeof topico === 'string')
              .map((topico) => topico.trim())
              .filter(Boolean)
          ),
        ];
      },
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

aulaSchema.index(
  { turmaId: 1, data: 1 },
  { unique: true, partialFilterExpression: { status: 'ativa' } }
);

module.exports = mongoose.model('Aula', aulaSchema);
