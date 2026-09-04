const mongoose = require('mongoose');

const GENEROS = ['masculino', 'feminino', 'neutro'];

// Normaliza string opcional: string vazia ou só espaços vira undefined.
function normalizarOpcional(valor) {
  if (typeof valor !== 'string') {
    return valor === null ? undefined : valor;
  }

  const limpo = valor.trim();

  return limpo.length === 0 ? undefined : limpo;
}

const alunoSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },

    generoGramatical: {
      type: String,
      required: true,
      enum: {
        values: GENEROS,
        message: 'Gênero gramatical deve ser masculino, feminino ou neutro.',
      },
    },

    // Dados do responsável são opcionais: o aluno pode existir sem responsável.
    nomeResponsavel: {
      type: String,
      trim: true,
    },

    generoResponsavel: {
      type: String,
      enum: {
        values: GENEROS,
        message: 'Gênero do responsável deve ser masculino, feminino ou neutro.',
      },
    },

    // Dado humano de contato. Não é preparado nem enviado para IA.
    contatoResponsavel: {
      type: String,
      trim: true,
    },

    // Sempre vem do JWT/contexto. Nunca é aceito do cliente.
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },

    status: {
      type: String,
      enum: ['ativo', 'inativo'],
      default: 'ativo',
    },
  },
  {
    timestamps: true,
  }
);

// Regra de responsável: se houver gênero ou contato do responsável,
// o nome do responsável passa a ser obrigatório.
alunoSchema.pre('validate', function validarResponsavel(next) {
  this.nomeResponsavel = normalizarOpcional(this.nomeResponsavel);
  this.generoResponsavel = normalizarOpcional(this.generoResponsavel);
  this.contatoResponsavel = normalizarOpcional(this.contatoResponsavel);

  const temDadoDependente =
    this.generoResponsavel !== undefined ||
    this.contatoResponsavel !== undefined;

  if (temDadoDependente && this.nomeResponsavel === undefined) {
    return next(
      new Error(
        'Informe o nome do responsável quando gênero ou contato do responsável forem preenchidos.'
      )
    );
  }

  return next();
});

alunoSchema.index({ professorId: 1, status: 1 });

module.exports = mongoose.model('Aluno', alunoSchema);
