const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');

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

const STATUS_TURMA = ['ativa', 'encerrada', 'todas'];

// Codigos canonicos da especificacao (secao 11.8).
function erro(mensagem, code) {
  return new GraphQLError(mensagem, { extensions: { code } });
}

function exigirUsuario(context) {
  if (!context.usuario) {
    throw erro('Usuário não autenticado.', 'UNAUTHENTICATED');
  }

  return context.usuario;
}

function validarPeriodoLetivo(periodoLetivo) {
  if (
    typeof periodoLetivo !== 'string' ||
    !/^\d{4}\.[12]$/.test(periodoLetivo)
  ) {
    throw erro(
      'Período letivo inválido. Use o formato AAAA.1 ou AAAA.2.',
      'BAD_USER_INPUT'
    );
  }
}

function validarEncontros(encontros) {
  if (!Array.isArray(encontros)) {
    throw erro(
      'Encontros devem ser informados como uma lista.',
      'BAD_USER_INPUT'
    );
  }

  // Especificacao 7.2: a turma precisa de um ou mais encontros.
  if (encontros.length === 0) {
    throw erro(
      'Informe pelo menos um encontro para a turma.',
      'BAD_USER_INPUT'
    );
  }

  for (const encontro of encontros) {
    if (!DIAS_SEMANA.includes(encontro.diaSemana)) {
      throw erro(
        `Dia da semana inválido: ${encontro.diaSemana}. Use ${DIAS_SEMANA.join(', ')}.`,
        'BAD_USER_INPUT'
      );
    }

    if (
      typeof encontro.horario !== 'string' ||
      !/^([01]\d|2[0-3]):([0-5]\d)$/.test(encontro.horario)
    ) {
      throw erro(
        `Horário inválido: ${encontro.horario}. Use o formato HH:mm.`,
        'BAD_USER_INPUT'
      );
    }
  }

  return encontros;
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw erro('ID da turma inválido.', 'BAD_USER_INPUT');
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

  const status =
    args.status === undefined || args.status === null ? 'ativa' : args.status;

  if (!STATUS_TURMA.includes(status)) {
    throw erro(
      "Status de turma inválido. Use 'ativa', 'encerrada' ou 'todas'.",
      'BAD_USER_INPUT'
    );
  }

  const filtro = {
    professorId: usuario.id,
  };

  if (status !== 'todas') {
    filtro.status = status;
  }

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
    throw erro(
      'Turma não encontrada ou não pertence ao usuário.',
      'NOT_FOUND'
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
        throw erro(
          'Turma não encontrada ou não pertence ao usuário.',
          'NOT_FOUND'
        );
      }

      turma.status = 'encerrada';

      // Só o status muda aqui: validar o documento inteiro quebraria turmas
      // criadas antes da regra de "pelo menos um encontro".
      await turma.save({ validateModifiedOnly: true });

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
        throw erro(
          'Turma não encontrada ou não pertence ao usuário.',
          'NOT_FOUND'
        );
      }

      turma.status = 'ativa';

      // Mesmo motivo do encerrarTurma: valida apenas o campo alterado.
      await turma.save({ validateModifiedOnly: true });

      return turma;
    },
  },
};

module.exports = turmaResolvers;