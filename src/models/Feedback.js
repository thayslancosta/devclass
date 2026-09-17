const mongoose = require('mongoose');

function textoSemCoercao(valor) {
  if (valor !== undefined && typeof valor !== 'string') {
    throw new Error('O texto deve ser uma string.');
  }

  return valor;
}

const feedbackSchema = new mongoose.Schema(
  {
    matriculaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Matricula',
      required: true,
    },
    tipo: {
      type: String,
      enum: ['parcial', 'final'],
      required: true,
      trim: true,
    },
    textoIAOriginal: {
      type: String,
      trim: true,
      set: textoSemCoercao,
      required: function () { return this.geradoPorIA; },
      validate: {
        validator: function (valor) {
          return valor === undefined || (this.geradoPorIA && valor.length > 0);
        },
        message: 'Texto original exige geração por IA e não pode ser vazio.',
      },
    },
    textoEditado: {
      type: String,
      required: true,
      trim: true,
      set: textoSemCoercao,
    },
    geradoPorIA: {
      type: Boolean,
      required: true,
      default: false,
    },
    geradoEm: {
      type: Date,
      required: function () { return this.geradoPorIA; },
      validate: {
        validator: function (valor) {
          return this.geradoPorIA || valor === undefined;
        },
        message: 'A data de geração exige um feedback gerado por IA.',
      },
    },
    statusEnvio: {
      type: String,
      enum: ['rascunho', 'enviado'],
      required: true,
      default: 'rascunho',
      trim: true,
    },
    enviadoEm: {
      type: Date,
      required: function () { return this.statusEnvio === 'enviado'; },
      validate: {
        validator: function (valor) {
          return this.statusEnvio !== 'rascunho' || valor === undefined;
        },
        message: 'Um rascunho não pode possuir data de envio.',
      },
    },
    status: {
      type: String,
      enum: ['ativo', 'arquivado'],
      required: true,
      default: 'ativo',
      trim: true,
    },
  },
  { timestamps: true }
);

feedbackSchema.index(
  { matriculaId: 1, tipo: 1 },
  { unique: true, partialFilterExpression: { status: 'ativo' } }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
