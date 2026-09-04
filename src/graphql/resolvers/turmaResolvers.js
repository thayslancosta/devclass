const mongoose = require('mongoose');
const Turma = require('../../models/Turma');

const DIAS_SEMANA = [
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
  'domingo',
];

function exigirUsuario(context) {
  if (!context.usuario) {
    throw new Error('Usuário não autenticado.');
  }

  return context.usuario;
}

function validarPeriodoLetivo(periodoLetivo) {
  if (
    typeof periodoLetivo !== 'string' ||
    !/^\d{4}\.[12]$/.test(periodoLetivo)
  ) {
    throw new Error(
      'Período letivo inválido. Use o formato AAAA.1 ou AAAA.2.'
    );
  }
}

function validarEncontros(encontros) {
  if (!encontros) {
    return [];
  }

  if (!Array.isArray(encontros)) {
    throw new Error('Encontros devem ser informados como uma lista.');
  }

  for (const encontro of encontros) {
    if (!DIAS_SEMANA.includes(encontro.diaSemana)) {
      throw new Error(
        `Dia da semana inválido: ${encontro.diaSemana}.`
      );
    }

    if (
      typeof encontro.horario !== 'string' ||
      !/^([01]\d|2[0-3]):([0-5]\d)$/.test(encontro.horario)
    ) {
      throw new Error(
        `Horário inválido: ${encontro.horario}. Use o formato HH:mm.`
      );
    }
  }

  return encontros;
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('ID da turma inválido.');
  }
}

const turmaResolvers = {
  Query: {
    periodosDisponiveis: async (_parent, _args, context) => {
      const usuario = exigirUsuario(context);

      const periodos = await Turma.distinct('periodoLetivo', {
        professorId: usuario.id,
      });

      return periodos.sort((a, b) => b.localeCompare(a));
    },

    minhasTurmas: async (_parent, args, context) => {
  const usuario = exigirUsuario(context);

  const filtro = {
    professorId: usuario.id,
    status: args.status || 'ativa',
  };

  if (
    args.periodoLetivo !== undefined &&
    args.periodoLetivo !== null
  ) {
    validarPeriodoLetivo(args.periodoLetivo);

    filtro.periodoLetivo = args.periodoLetivo;
  }

  return Turma.find(filtro).sort({
    periodoLetivo: -1,
    createdAt: -1,
  });
},

    turma: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);

      validarId(id);

      return Turma.findOne({
        _id: id,
        professorId: usuario.id,
      });
    },
  },

  Mutation: {
    criarTurma: async (_parent, { input }, context) => {
      const usuario = exigirUsuario(context);

      validarPeriodoLetivo(input.periodoLetivo);
      validarEncontros(input.encontros);

      const turma = await Turma.create({
        nome: input.nome,
        estagio: input.estagio,
        periodoLetivo: input.periodoLetivo,
        encontros: input.encontros || [],
        professorId: usuario.id,
        status: 'ativa',
      });

      return turma;
    },

    atualizarTurma: async (_parent, { id, input }, context) => {
  const usuario = exigirUsuario(context);

  validarId(id);
  validarEncontros(input.encontros);

  const turma = await Turma.findOne({
    _id: id,
    professorId: usuario.id,
  });

  if (!turma) {
    throw new Error(
      'Turma não encontrada ou não pertence ao usuário.'
    );
  }

  turma.nome = input.nome;
  turma.estagio = input.estagio;
  turma.encontros = input.encontros || [];

  await turma.save();

  return turma;
},
    
    encerrarTurma: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);

      validarId(id);

      const turma = await Turma.findOne({
        _id: id,
        professorId: usuario.id,
      });

      if (!turma) {
        throw new Error(
          'Turma não encontrada ou não pertence ao usuário.'
        );
      }

      turma.status = 'encerrada';

      await turma.save();

      return turma;
    },

    reativarTurma: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);

      validarId(id);

      const turma = await Turma.findOne({
        _id: id,
        professorId: usuario.id,
      });

      if (!turma) {
        throw new Error(
          'Turma não encontrada ou não pertence ao usuário.'
        );
      }

      turma.status = 'ativa';

      await turma.save();

      return turma;
    },
  },
};

module.exports = turmaResolvers;