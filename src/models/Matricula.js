const mongoose = require('mongoose');

const matriculaSchema = new mongoose.Schema(
  {
    alunoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Aluno',
      required: true,
    },

    turmaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turma',
      required: true,
    },

    // Copiado da turma no momento da matrícula. Nunca vem do cliente.
    periodoLetivo: {
      type: String,
      required: true,
      match: [
        /^\d{4}\.[12]$/,
        'Período letivo deve estar no formato AAAA.1 ou AAAA.2.',
      ],
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

// Um aluno só pode ter uma matrícula por período letivo.
// Isso impede que ele esteja em duas turmas no mesmo semestre,
// mas continua permitindo matrícula em outro semestre.
matriculaSchema.index({ alunoId: 1, periodoLetivo: 1 }, { unique: true });

matriculaSchema.index({ turmaId: 1, status: 1 });

module.exports = mongoose.model('Matricula', matriculaSchema);
