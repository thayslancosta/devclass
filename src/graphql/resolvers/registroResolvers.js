const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');

const RegistroDiario = require('../../models/RegistroDiario');
const Aula = require('../../models/Aula');
const Matricula = require('../../models/Matricula');
const Turma = require('../../models/Turma');
const Aluno = require('../../models/Aluno');
const { montarPromptMensagemDiaria } = require('../../services/promptService');
const { gerarTexto } = require('../../services/iaService');

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

const STATUS_REGISTRO = ['ativo', 'arquivado', 'todos'];
const MENSAGEM_DUPLICIDADE = 'Já existe um registro diário ativo para esta matrícula nesta aula.';

function erro(mensagem, code) {
  return new GraphQLError(mensagem, {
    extensions: { code },
  });
}

function tratarErroDuplicidade(falha) {
  if (falha.code === 11000 || falha.code === 11001) {
    throw erro(MENSAGEM_DUPLICIDADE, 'CONFLICT');
  }

  throw falha;
}

async function validarRegistroUnico(aulaId, matriculaId, id) {
  const filtro = { aulaId, matriculaId, status: 'ativo' };
  if (id) filtro._id = { $ne: id };

  if (await RegistroDiario.findOne(filtro)) {
    throw erro(MENSAGEM_DUPLICIDADE, 'CONFLICT');
  }
}

function exigirUsuario(context) {
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

function validarData(data, rotulo = 'data') {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw erro(`A ${rotulo} informada é inválida.`, 'BAD_USER_INPUT');
  }

  const valor = new Date(`${data}T00:00:00.000Z`);

  if (Number.isNaN(valor.getTime()) || valor.toISOString().slice(0, 10) !== data) {
    throw erro(`A ${rotulo} informada é inválida.`, 'BAD_USER_INPUT');
  }

  return valor;
}

function validarDataNoPeriodo(data, periodoLetivo, rotulo) {
  const valor = validarData(data, rotulo);
  const ano = valor.getUTCFullYear();
  const semestre = valor.getUTCMonth() < 6 ? 1 : 2;

  if (`${ano}.${semestre}` !== periodoLetivo) {
    throw erro(
      `A ${rotulo} deve pertencer ao período letivo ${periodoLetivo}.`,
      'BAD_USER_INPUT'
    );
  }

  return valor;
}

function validarIntervalo(dataInicio, dataFim, periodoLetivo) {
  const inicio = dataInicio
    ? validarDataNoPeriodo(dataInicio, periodoLetivo, 'data inicial')
    : null;
  const fim = dataFim
    ? validarDataNoPeriodo(dataFim, periodoLetivo, 'data final')
    : null;

  if (inicio && fim && inicio > fim) {
    throw erro(
      'A data inicial não pode ser posterior à data final.',
      'BAD_USER_INPUT'
    );
  }

  return { inicio, fim };
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

async function exigirEstruturaAtiva(aula, matricula, usuario) {
  const turma = await buscarTurmaDoProfessor(aula.turmaId, usuario);

  if (turma.status !== 'ativa') {
    throw erro(
      'A turma deve estar ativa para operar um registro ativo.',
      'BAD_USER_INPUT'
    );
  }

  if (matricula.status !== 'ativa') {
    throw erro(
      'A matrícula deve estar ativa para operar um registro ativo.',
      'BAD_USER_INPUT'
    );
  }

  if (aula.status !== 'ativa') {
    throw erro(
      'A aula deve estar ativa para operar um registro ativo.',
      'BAD_USER_INPUT'
    );
  }
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

      const filtroStatus = status ?? 'ativo';

      if (!STATUS_REGISTRO.includes(filtroStatus)) {
        throw erro(
          "Status de registro inválido. Use 'ativo', 'arquivado' ou 'todos'.",
          'BAD_USER_INPUT'
        );
      }

      if (filtroStatus === 'ativo') {
        filtroAula.status = 'ativa';
      }

      const { inicio, fim } = validarIntervalo(
        dataInicio,
        dataFim,
        matricula.periodoLetivo
      );

      if (inicio || fim) {
        filtroAula.data = {};
        if (inicio) filtroAula.data.$gte = inicio;
        if (fim) filtroAula.data.$lte = fim;
      }

      const aulas = await Aula.find(filtroAula).select('_id');
      const aulaIds = aulas.map((aula) => aula._id);

      const filtro = {
        matriculaId,
        aulaId: { $in: aulaIds },
      };

      if (filtroStatus !== 'todos') {
        filtro.status = filtroStatus;
      }

      return RegistroDiario.find(filtro).sort({ createdAt: -1 });
    },
  },

  Mutation: {
    gerarMensagemDiaria: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);
      validarId(id, 'do registro');
      const registro = await RegistroDiario.findById(id);
      if (!registro) throw erro('Registro não encontrado.', 'NOT_FOUND');

      const aula = await buscarAulaDoProfessor(registro.aulaId, usuario);
      const matricula = await buscarMatriculaDoProfessor(registro.matriculaId, usuario);
      const aluno = await Aluno.findOne({
        _id: matricula.alunoId, professorId: usuario.id,
      }).select('nome generoGramatical nomeResponsavel generoResponsavel');
      if (!aluno) throw erro('Aluno não encontrado.', 'NOT_FOUND');
      if (String(aula.turmaId) !== String(matricula.turmaId)) {
        throw erro('O registro possui aula e matrícula de turmas diferentes.', 'BAD_USER_INPUT');
      }
      if (registro.status !== 'ativo') {
        throw erro('O registro deve estar ativo para gerar uma mensagem.', 'BAD_USER_INPUT');
      }
      await exigirEstruturaAtiva(aula, matricula, usuario);
      const turma = await buscarTurmaDoProfessor(aula.turmaId, usuario);
      const prompt = montarPromptMensagemDiaria({
        aluno: {
          nome: aluno.nome, generoGramatical: aluno.generoGramatical,
          nomeResponsavel: aluno.nomeResponsavel, generoResponsavel: aluno.generoResponsavel,
        },
        turma: { nome: turma.nome, estagio: turma.estagio, periodoLetivo: turma.periodoLetivo },
        aula: { data: aula.data, topicos: [...(aula.topicos || [])] },
        registro: {
          observacaoGeral: registro.observacaoGeral,
          avaliacoes: (registro.avaliacoes || []).map(avaliacao => ({
            habilidade: avaliacao.habilidade, desempenho: avaliacao.desempenho,
            observacao: avaliacao.observacao, outraDescricao: avaliacao.outraDescricao,
          })),
        },
      });
      const texto = await gerarTexto(prompt);
      registro.mensagemIAOriginal = texto;
      registro.mensagemEditada = texto;
      registro.geradaEm = new Date();
      await registro.save();
      return registro;
    },

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

      await exigirEstruturaAtiva(aula, matricula, usuario);

      await validarRegistroUnico(input.aulaId, input.matriculaId);

      try {
        return await RegistroDiario.create({
          aulaId: input.aulaId,
          matriculaId: input.matriculaId,
          observacaoGeral: input.observacaoGeral,
          avaliacoes: input.avaliacoes || [],
        });
      } catch (falha) {
        tratarErroDuplicidade(falha);
      }
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

      if (registro.status === 'ativo') {
        await exigirEstruturaAtiva(aula, matricula, usuario);
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

      validarId(id, 'do registro');

      const registro = await RegistroDiario.findById(id);

      if (!registro) {
        throw erro('Registro não encontrado.', 'NOT_FOUND');
      }

      const [aula, matricula] = await Promise.all([
        buscarAulaDoProfessor(registro.aulaId, usuario),
        buscarMatriculaDoProfessor(registro.matriculaId, usuario),
      ]);

      if (matricula.turmaId.toString() !== aula.turmaId.toString()) {
        throw erro(
          'O registro possui aula e matrícula de turmas diferentes.',
          'BAD_USER_INPUT'
        );
      }

      registro.status = 'arquivado';

      await registro.save();

      return registro;
    },

    restaurarRegistro: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);

      validarId(id, 'do registro');

      const registro = await RegistroDiario.findById(id);

      if (!registro) {
        throw erro('Registro não encontrado.', 'NOT_FOUND');
      }

      const [aula, matricula] = await Promise.all([
        buscarAulaDoProfessor(registro.aulaId, usuario),
        buscarMatriculaDoProfessor(registro.matriculaId, usuario),
      ]);

      if (matricula.turmaId.toString() !== aula.turmaId.toString()) {
        throw erro(
          'O registro possui aula e matrícula de turmas diferentes.',
          'BAD_USER_INPUT'
        );
      }

      await exigirEstruturaAtiva(aula, matricula, usuario);
      await validarRegistroUnico(registro.aulaId, registro.matriculaId, registro._id);

      registro.status = 'ativo';

      try {
        await registro.save();
      } catch (falha) {
        tratarErroDuplicidade(falha);
      }

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

      const [aula, matricula] = await Promise.all([
        buscarAulaDoProfessor(registro.aulaId, usuario),
        buscarMatriculaDoProfessor(registro.matriculaId, usuario),
      ]);

      if (matricula.turmaId.toString() !== aula.turmaId.toString()) {
        throw erro(
          'O registro possui aula e matrícula de turmas diferentes.',
          'BAD_USER_INPUT'
        );
      }

      if (registro.status === 'ativo') {
        await exigirEstruturaAtiva(aula, matricula, usuario);
      }

      registro.mensagemEditada = texto;

      await registro.save();

      return registro;
    },
  },
};

module.exports = registroResolvers;
