const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');

const Aula = require('../../models/Aula');
const Turma = require('../../models/Turma');

const STATUS_AULA = ['ativa', 'arquivada', 'todas'];
const MENSAGEM_DUPLICIDADE = 'Já existe uma aula ativa nesta turma para esta data.';

function erro(mensagem, code) {
  return new GraphQLError(mensagem, { extensions: { code } });
}

function tratarErroDuplicidade(falha) {
  if (falha.code === 11000 || falha.code === 11001) {
    throw erro(MENSAGEM_DUPLICIDADE, 'CONFLICT');
  }

  throw falha;
}

async function validarAulaUnica(turmaId, data, id) {
  const filtro = { turmaId, data, status: 'ativa' };
  if (id) filtro._id = { $ne: id };

  if (await Aula.findOne(filtro)) {
    throw erro(MENSAGEM_DUPLICIDADE, 'CONFLICT');
  }
}

function exigirProfessor(context) {
  if (!context.usuario) {
    throw erro('Usuário não autenticado.', 'UNAUTHENTICATED');
  }

  if (context.usuario.perfil !== 'professor') {
    throw erro(
      'Somente professores podem acessar dados pedagógicos.',
      'FORBIDDEN'
    );
  }

  return context.usuario;
}

function validarId(id, rotulo) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw erro(`ID ${rotulo} inválido.`, 'BAD_USER_INPUT');
  }
}

function validarData(data, rotulo) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw erro(`${rotulo} inválida.`, 'BAD_USER_INPUT');
  }

  const valor = new Date(`${data}T00:00:00.000Z`);

  if (Number.isNaN(valor.getTime()) || valor.toISOString().slice(0, 10) !== data) {
    throw erro(`${rotulo} inválida.`, 'BAD_USER_INPUT');
  }

  return valor;
}

function validarDataNoPeriodo(data, periodoLetivo, rotulo = 'Data da aula') {
  const valor = validarData(data, rotulo);
  const ano = valor.getUTCFullYear();
  const semestre = valor.getUTCMonth() < 6 ? 1 : 2;

  if (`${ano}.${semestre}` !== periodoLetivo) {
    throw erro(
      `${rotulo} deve pertencer ao período letivo ${periodoLetivo}.`,
      'BAD_USER_INPUT'
    );
  }

  return valor;
}

function validarIntervalo(dataInicio, dataFim, periodoLetivo) {
  const inicio = dataInicio
    ? validarDataNoPeriodo(dataInicio, periodoLetivo, 'Data inicial')
    : null;
  const fim = dataFim
    ? validarDataNoPeriodo(dataFim, periodoLetivo, 'Data final')
    : null;

  if (inicio && fim && inicio > fim) {
    throw erro(
      'A data inicial não pode ser posterior à data final.',
      'BAD_USER_INPUT'
    );
  }

  return { inicio, fim };
}

function validarStatus(status) {
  if (!STATUS_AULA.includes(status)) {
    throw erro(
      "Status de aula inválido. Use 'ativa', 'arquivada' ou 'todas'.",
      'BAD_USER_INPUT'
    );
  }
}

function normalizarTopicos(topicos) {
  if (topicos === undefined || topicos === null) return [];

  if (!Array.isArray(topicos)) {
    throw erro('Os tópicos devem ser informados como uma lista.', 'BAD_USER_INPUT');
  }

  if (topicos.some((topico) => typeof topico !== 'string')) {
    throw erro('Cada tópico deve ser um texto.', 'BAD_USER_INPUT');
  }

  return [...new Set(topicos.map((topico) => topico.trim()).filter(Boolean))];
}

async function buscarTurmaDoProfessor(id, usuario) {
  validarId(id, 'da turma');

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

  return turma;
}

async function buscarAulaDoProfessor(id, usuario) {
  validarId(id, 'da aula');

  const aula = await Aula.findById(id);

  if (!aula) {
    throw erro('Aula não encontrada.', 'NOT_FOUND');
  }

  const turma = await buscarTurmaDoProfessor(aula.turmaId, usuario);

  return { aula, turma };
}

function exigirTurmaAtiva(turma) {
  if (turma.status !== 'ativa') {
    throw erro(
      'A turma deve estar ativa para criar, restaurar ou atualizar uma aula ativa.',
      'BAD_USER_INPUT'
    );
  }
}

async function alterarStatus(id, usuario, status) {
  const { aula, turma } = await buscarAulaDoProfessor(id, usuario);

  if (status === 'ativa') {
    exigirTurmaAtiva(turma);
    await validarAulaUnica(aula.turmaId, aula.data, aula._id);
  }

  aula.status = status;
  try {
    await aula.save();
  } catch (falha) {
    tratarErroDuplicidade(falha);
  }

  return aula;
}

const aulaResolvers = {
  Aula: {
    data: (aula) => {
      return new Date(aula.data).toISOString().slice(0, 10);
    },
  },

  Query: {
    aulas: async (
      _parent,
      { turmaId, dataInicio, dataFim, status },
      context
    ) => {
      const usuario = exigirProfessor(context);
      const turma = await buscarTurmaDoProfessor(turmaId, usuario);

      const filtroStatus = status ?? 'ativa';
      validarStatus(filtroStatus);

      const filtro = { turmaId: turma._id };
      if (filtroStatus !== 'todas') {
        filtro.status = filtroStatus;
      }

      const { inicio, fim } = validarIntervalo(
        dataInicio,
        dataFim,
        turma.periodoLetivo
      );

      if (inicio || fim) {
        filtro.data = {};
        if (inicio) filtro.data.$gte = inicio;
        if (fim) filtro.data.$lte = fim;
      }

      return Aula.find(filtro).sort({ data: -1 });
    },
  },

  Mutation: {
    criarAula: async (_parent, { input }, context) => {
      const usuario = exigirProfessor(context);
      const turma = await buscarTurmaDoProfessor(input.turmaId, usuario);
      exigirTurmaAtiva(turma);
      const data = validarDataNoPeriodo(input.data, turma.periodoLetivo);

      await validarAulaUnica(turma._id, data);

      try {
        return await Aula.create({
          turmaId: turma._id,
          data,
          topicos: normalizarTopicos(input.topicos),
          status: 'ativa',
        });
      } catch (falha) {
        tratarErroDuplicidade(falha);
      }
    },

    atualizarAula: async (_parent, { id, input }, context) => {
      const usuario = exigirProfessor(context);
      const { aula, turma } = await buscarAulaDoProfessor(id, usuario);

      if (aula.status === 'ativa') {
        exigirTurmaAtiva(turma);
      }

      if (input.data !== undefined && input.data !== null) {
        aula.data = validarDataNoPeriodo(input.data, turma.periodoLetivo);
      }

      if (input.topicos !== undefined && input.topicos !== null) {
        aula.topicos = normalizarTopicos(input.topicos);
      }

      try {
        await aula.save();
      } catch (falha) {
        tratarErroDuplicidade(falha);
      }

      return aula;
    },

    arquivarAula: async (_parent, { id }, context) => {
      const usuario = exigirProfessor(context);
      return alterarStatus(id, usuario, 'arquivada');
    },

    restaurarAula: async (_parent, { id }, context) => {
      const usuario = exigirProfessor(context);
      return alterarStatus(id, usuario, 'ativa');
    },
  },
};

module.exports = aulaResolvers;
