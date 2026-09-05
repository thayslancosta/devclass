const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');

const RegistroDiario = require('../../models/RegistroDiario');
const Aula = require('../../models/Aula');
const Matricula = require('../../models/Matricula');
const Turma = require('../../models/Turma');

const HABILIDADES_VALIDAS = [
  'speaking',
  'listening',
  'reading',
  'writing',
  'grammar',
  'vocabulary',
  'pronunciation',
  'participation',
  'outra',
];

const DESEMPENHOS_VALIDOS = [
  'destaque',
  'adequado',
  'precisa_de_atencao',
];

function erro(mensagem, code) {
  return new GraphQLError(mensagem, {
    extensions: { code },
  });
}

function exigirUsuario(context) {
  if (!context.usuario) {
    throw erro('Usuário não autenticado.', 'UNAUTHENTICATED');
  }

  return context.usuario;
}

function validarId(id, rotulo) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw erro(`ID ${rotulo} inválido.`, 'BAD_USER_INPUT');
  }
}

function validarData(data, rotulo = 'data') {
  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    throw erro(`A ${rotulo} informada é inválida.`, 'BAD_USER_INPUT');
  }

  return valor;
}

function validarAvaliacoes(avaliacoes) {
  if (avaliacoes === undefined || avaliacoes === null) {
    return;
  }

  if (!Array.isArray(avaliacoes)) {
    throw erro('As avaliações devem ser uma lista.', 'BAD_USER_INPUT');
  }

  for (const avaliacao of avaliacoes) {
    if (!HABILIDADES_VALIDAS.includes(avaliacao.habilidade)) {
      throw erro(
        `Habilidade inválida: ${avaliacao.habilidade}.`,
        'BAD_USER_INPUT'
      );
    }

    if (!DESEMPENHOS_VALIDOS.includes(avaliacao.desempenho)) {
      throw erro(
        `Desempenho inválido: ${avaliacao.desempenho}.`,
        'BAD_USER_INPUT'
      );
    }

    if (
      avaliacao.habilidade === 'outra' &&
      (!avaliacao.outraDescricao ||
        avaliacao.outraDescricao.trim() === '')
    ) {
      throw erro(
        'Quando a habilidade for "outra", outraDescricao é obrigatória.',
        'BAD_USER_INPUT'
      );
    }
  }
}

function validarConteudoRegistro(observacaoGeral, avaliacoes) {
  const possuiObservacao =
    typeof observacaoGeral === 'string' &&
    observacaoGeral.trim().length > 0;

  const possuiAvaliacao =
    Array.isArray(avaliacoes) && avaliacoes.length > 0;

  if (!possuiObservacao && !possuiAvaliacao) {
    throw erro(
      'O registro deve possuir uma observação geral ou pelo menos uma avaliação.',
      'BAD_USER_INPUT'
    );
  }
}

async function buscarTurmaDoProfessor(turmaId, usuario) {
  const turma = await Turma.findOne({
    _id: turmaId,
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

  await buscarTurmaDoProfessor(aula.turmaId, usuario);

  return aula;
}

async function buscarMatriculaDoProfessor(id, usuario) {
  validarId(id, 'da matrícula');

  const matricula = await Matricula.findById(id);

  if (!matricula) {
    throw erro('Matrícula não encontrada.', 'NOT_FOUND');
  }

  const turma = await Turma.findOne({
    _id: matricula.turmaId,
    professorId: usuario.id,
  });

  if (!turma) {
    throw erro(
      'Matrícula não encontrada ou não pertence ao usuário.',
      'NOT_FOUND'
    );
  }

  return matricula;
}

const registroResolvers = {
  Query: {
    registros: async (
      _parent,
      { matriculaId, dataInicio, dataFim, status },
      context
    ) => {
      const usuario = exigirUsuario(context);

      const matricula = await buscarMatriculaDoProfessor(
        matriculaId,
        usuario
      );

      const filtroAula = {
        turmaId: matricula.turmaId,
      };

      if (dataInicio || dataFim) {
        filtroAula.data = {};

        if (dataInicio) {
          filtroAula.data.$gte = validarData(
            dataInicio,
            'data inicial'
          );
        }

        if (dataFim) {
          filtroAula.data.$lte = validarData(
            dataFim,
            'data final'
          );
        }
      }

      const aulas = await Aula.find(filtroAula).select('_id');
      const aulaIds = aulas.map((aula) => aula._id);

      const filtro = {
        matriculaId,
        aulaId: { $in: aulaIds },
      };

      if (status) {
        filtro.status = status;
      }

      return RegistroDiario.find(filtro).sort({ createdAt: -1 });
    },
  },

  Mutation: {
    adicionarRegistro: async (_parent, { input }, context) => {
      const usuario = exigirUsuario(context);

      validarId(input.aulaId, 'da aula');
      validarId(input.matriculaId, 'da matrícula');

      validarConteudoRegistro(
        input.observacaoGeral,
        input.avaliacoes
      );

      validarAvaliacoes(input.avaliacoes);

      const aula = await buscarAulaDoProfessor(
        input.aulaId,
        usuario
      );

      const matricula = await buscarMatriculaDoProfessor(
        input.matriculaId,
        usuario
      );

      if (
        matricula.turmaId.toString() !==
        aula.turmaId.toString()
      ) {
        throw erro(
          'A matrícula não pertence à mesma turma da aula.',
          'BAD_USER_INPUT'
        );
      }

      if (matricula.status !== 'ativa') {
        throw erro(
          'Não é possível registrar dados para uma matrícula encerrada.',
          'BAD_USER_INPUT'
        );
      }

      return RegistroDiario.create({
        aulaId: input.aulaId,
        matriculaId: input.matriculaId,
        observacaoGeral: input.observacaoGeral,
        avaliacoes: input.avaliacoes || [],
      });
    },

    atualizarRegistro: async (_parent, { id, input }, context) => {
      const usuario = exigirUsuario(context);

      validarId(id, 'do registro');

      const registro = await RegistroDiario.findById(id);

      if (!registro) {
        throw erro('Registro não encontrado.', 'NOT_FOUND');
      }

      const aula = await buscarAulaDoProfessor(
        registro.aulaId,
        usuario
      );

      const matricula = await buscarMatriculaDoProfessor(
        registro.matriculaId,
        usuario
      );

      if (
        matricula.turmaId.toString() !==
        aula.turmaId.toString()
      ) {
        throw erro(
          'O registro possui aula e matrícula de turmas diferentes.',
          'BAD_USER_INPUT'
        );
      }

      const novaObservacao =
        input.observacaoGeral !== undefined
          ? input.observacaoGeral
          : registro.observacaoGeral;

      const novasAvaliacoes =
        input.avaliacoes !== undefined
          ? input.avaliacoes
          : registro.avaliacoes;

      validarConteudoRegistro(
        novaObservacao,
        novasAvaliacoes
      );

      validarAvaliacoes(novasAvaliacoes);

      if (input.observacaoGeral !== undefined) {
        registro.observacaoGeral = input.observacaoGeral;
      }

      if (input.avaliacoes !== undefined) {
        registro.avaliacoes = input.avaliacoes;
      }

      await registro.save();

      return registro;
    },

    arquivarRegistro: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);

      const registro = await RegistroDiario.findById(id);

      if (!registro) {
        throw erro('Registro não encontrado.', 'NOT_FOUND');
      }

      await buscarAulaDoProfessor(
        registro.aulaId,
        usuario
      );

      registro.status = 'arquivado';

      await registro.save();

      return registro;
    },

    restaurarRegistro: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);

      const registro = await RegistroDiario.findById(id);

      if (!registro) {
        throw erro('Registro não encontrado.', 'NOT_FOUND');
      }

      await buscarAulaDoProfessor(
        registro.aulaId,
        usuario
      );

      registro.status = 'ativo';

      await registro.save();

      return registro;
    },

    editarMensagemDiaria: async (
      _parent,
      { id, texto },
      context
    ) => {
      const usuario = exigirUsuario(context);

      validarId(id, 'do registro');

      const registro = await RegistroDiario.findById(id);

      if (!registro) {
        throw erro('Registro não encontrado.', 'NOT_FOUND');
      }

      await buscarAulaDoProfessor(
        registro.aulaId,
        usuario
      );

      registro.mensagemEditada = texto;

      await registro.save();

      return registro;
    },
  },
};

module.exports = registroResolvers;