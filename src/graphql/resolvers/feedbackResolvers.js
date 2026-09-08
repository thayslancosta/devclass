const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');

const Feedback = require('../../models/Feedback');
const Matricula = require('../../models/Matricula');
const Turma = require('../../models/Turma');
const Aluno = require('../../models/Aluno');
const Aula = require('../../models/Aula');
const RegistroDiario = require('../../models/RegistroDiario');
const { montarPromptFeedback } = require('../../services/promptService');
const { gerarTexto } = require('../../services/iaService');

const TIPOS = ['parcial', 'final'];
const STATUS_ENVIO = ['rascunho', 'enviado'];
const STATUS = ['ativo', 'arquivado', 'todos'];
const MENSAGEM_DUPLICIDADE = 'Já existe um feedback ativo deste tipo para esta matrícula.';

function erro(mensagem, code) {
  return new GraphQLError(mensagem, { extensions: { code } });
}

function exigirProfessor(context) {
  if (!context.usuario) {
    throw erro('Usuário não autenticado.', 'UNAUTHENTICATED');
  }
  if (context.usuario.perfil !== 'professor') {
    throw erro('Somente professores podem acessar feedbacks.', 'FORBIDDEN');
  }
  return context.usuario;
}

function validarId(id, rotulo) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw erro(`ID ${rotulo} inválido.`, 'BAD_USER_INPUT');
  }
}

function validarOpcao(valor, opcoes, rotulo) {
  if (!opcoes.includes(valor)) {
    throw erro(`${rotulo} inválido.`, 'BAD_USER_INPUT');
  }
}

function validarTexto(texto) {
  if (typeof texto !== 'string' || !texto.trim()) {
    throw erro('O texto do feedback deve ser uma string não vazia.', 'BAD_USER_INPUT');
  }
  return texto.trim();
}

async function executarNoBanco(operacao) {
  try {
    return await operacao();
  } catch (falha) {
    if (falha && (falha.code === 11000 || falha.code === 11001)) {
      throw erro(MENSAGEM_DUPLICIDADE, 'CONFLICT');
    }
    throw erro('Não foi possível acessar os feedbacks neste momento.', 'INTERNAL_SERVER_ERROR');
  }
}

async function buscarMatriculaDoProfessor(id, usuario, permitirAusente = false) {
  validarId(id, 'da matrícula');
  const matricula = await executarNoBanco(() => Matricula.findById(id));
  const turma = matricula
    ? await executarNoBanco(() => Turma.findOne({
      _id: matricula.turmaId,
      professorId: usuario.id,
    }))
    : null;

  if (!turma) {
    if (permitirAusente) return null;
    throw erro('Matrícula não encontrada ou não pertence ao usuário.', 'NOT_FOUND');
  }
  return matricula;
}

async function buscarFeedbackDoProfessor(id, usuario, permitirAusente = false) {
  validarId(id, 'do feedback');
  const feedback = await executarNoBanco(() => Feedback.findById(id));
  const matricula = feedback
    ? await buscarMatriculaDoProfessor(feedback.matriculaId, usuario, true)
    : null;

  if (!matricula) {
    if (permitirAusente) return null;
    throw erro('Feedback não encontrado ou não pertence ao usuário.', 'NOT_FOUND');
  }
  return feedback;
}

async function validarFeedbackUnico(matriculaId, tipo, id) {
  const filtro = { matriculaId, tipo, status: 'ativo' };
  if (id) filtro._id = { $ne: id };
  if (await executarNoBanco(() => Feedback.findOne(filtro))) {
    throw erro(MENSAGEM_DUPLICIDADE, 'CONFLICT');
  }
}

function exigirAtivo(feedback) {
  if (feedback.status !== 'ativo') {
    throw erro('Restaure o feedback antes de realizar esta operação.', 'CONFLICT');
  }
}

async function alterarEnvio(id, usuario, statusEnvio) {
  const feedback = await buscarFeedbackDoProfessor(id, usuario);
  exigirAtivo(feedback);
  if (feedback.statusEnvio === statusEnvio) return feedback;

  feedback.statusEnvio = statusEnvio;
  feedback.enviadoEm = statusEnvio === 'enviado' ? new Date() : undefined;
  await executarNoBanco(() => feedback.save());
  return feedback;
}

const feedbackResolvers = {
  Query: {
    feedback: async (_parent, { id }, context) => {
      const usuario = exigirProfessor(context);
      return buscarFeedbackDoProfessor(id, usuario, true);
    },

    feedbacks: async (_parent, { matriculaId, tipo, statusEnvio, status }, context) => {
      const usuario = exigirProfessor(context);
      const matricula = await buscarMatriculaDoProfessor(matriculaId, usuario);
      const filtro = { matriculaId: matricula._id };
      const filtroStatus = status ?? 'ativo';
      validarOpcao(filtroStatus, STATUS, 'Status');
      if (filtroStatus !== 'todos') filtro.status = filtroStatus;
      if (tipo !== undefined && tipo !== null) {
        validarOpcao(tipo, TIPOS, 'Tipo de feedback');
        filtro.tipo = tipo;
      }
      if (statusEnvio !== undefined && statusEnvio !== null) {
        validarOpcao(statusEnvio, STATUS_ENVIO, 'Estado de envio');
        filtro.statusEnvio = statusEnvio;
      }

      // O ID desempata feedbacks com o mesmo tipo e instante de criação.
      return executarNoBanco(() => Feedback.find(filtro).sort({ tipo: 1, createdAt: -1, _id: 1 }));
    },
  },

  Mutation: {
    gerarFeedbacks: async (_parent, { input }, context) => {
      const usuario = exigirProfessor(context);
      const { matriculaIds, tipo } = input;
      validarOpcao(tipo, TIPOS, 'Tipo de feedback');
      if (!Array.isArray(matriculaIds) || !matriculaIds.length) {
        throw erro('Informe ao menos uma matrícula.', 'BAD_USER_INPUT');
      }
      matriculaIds.forEach(id => validarId(id, 'da matrícula'));
      if (new Set(matriculaIds.map(id => String(id).toLowerCase())).size !== matriculaIds.length) {
        throw erro('Não repita matrículas na seleção.', 'BAD_USER_INPUT');
      }

      // Autoriza toda a seleção antes de examinar estados ou preparar a geração.
      const contextos = [];
      for (const id of matriculaIds) {
        const matricula = await buscarMatriculaDoProfessor(id, usuario);
        const turma = await executarNoBanco(() => Turma.findOne({
          _id: matricula.turmaId, professorId: usuario.id,
        }));
        const aluno = await executarNoBanco(() => Aluno.findOne({
          _id: matricula.alunoId, professorId: usuario.id,
        }).select('nome generoGramatical nomeResponsavel generoResponsavel'));
        if (!turma || !aluno) throw erro('Aluno ou turma não encontrado.', 'NOT_FOUND');
        contextos.push({ matricula, turma, aluno });
      }

      const preparados = [];
      for (const { matricula, turma, aluno } of contextos) {
        const feedback = await executarNoBanco(() => Feedback.findOne({
          matriculaId: matricula._id, tipo, status: 'ativo',
        }));
        if (feedback?.statusEnvio === 'enviado') {
          throw erro('Desmarque o envio antes de regenerar o feedback.', 'CONFLICT');
        }
        // Aulas arquivadas continuam sendo evidências históricas válidas.
        const aulas = await executarNoBanco(() => Aula.find({ turmaId: turma._id })
          .select('_id data topicos').sort({ data: 1, _id: 1 }));
        const porId = new Map(aulas.map(aula => [String(aula._id), aula]));
        const registros = await executarNoBanco(() => RegistroDiario.find({
          matriculaId: matricula._id, status: 'ativo', aulaId: { $in: aulas.map(aula => aula._id) },
        }).sort({ _id: 1 }));
        const prompt = montarPromptFeedback({
          tipo,
          aluno: {
            nome: aluno.nome, generoGramatical: aluno.generoGramatical,
            nomeResponsavel: aluno.nomeResponsavel, generoResponsavel: aluno.generoResponsavel,
          },
          turma: { nome: turma.nome, estagio: turma.estagio, periodoLetivo: turma.periodoLetivo },
          registros: registros.map(registro => {
            const aula = porId.get(String(registro.aulaId));
            return {
              status: registro.status,
              aula: { data: aula.data, topicos: [...(aula.topicos || [])] },
              observacaoGeral: registro.observacaoGeral,
              avaliacoes: (registro.avaliacoes || []).map(avaliacao => ({
                habilidade: avaliacao.habilidade, desempenho: avaliacao.desempenho,
                observacao: avaliacao.observacao, outraDescricao: avaliacao.outraDescricao,
              })),
            };
          }),
        });
        preparados.push({ matricula, feedback, prompt });
      }

      // Nenhuma escrita ocorre enquanto houver geração pendente no lote.
      const textos = [];
      for (const { prompt } of preparados) textos.push(await gerarTexto(prompt));
      const resultados = [];
      for (const [indice, { matricula, feedback }] of preparados.entries()) {
        const campos = {
          textoIAOriginal: textos[indice], textoEditado: textos[indice],
          geradoPorIA: true, geradoEm: new Date(), statusEnvio: 'rascunho',
        };
        if (feedback) {
          // As validações cruzadas do model exigem contexto de documento, não de query.
          Object.assign(feedback, campos);
          await executarNoBanco(() => feedback.validate());
          // Não sobrescreve confirmação de envio ou arquivamento concorrente.
          const atualizado = await executarNoBanco(() => Feedback.findOneAndUpdate({
            _id: feedback._id, status: 'ativo', statusEnvio: 'rascunho',
          }, { $set: campos }, { new: true }));
          if (!atualizado) {
            throw erro('O feedback mudou durante a geração. Consulte o estado atual.', 'CONFLICT');
          }
          resultados.push(atualizado);
        } else {
          resultados.push(await executarNoBanco(() => Feedback.create({
            matriculaId: matricula._id, tipo, ...campos, status: 'ativo',
          })));
        }
      }
      return resultados;
    },

    criarFeedbackManual: async (_parent, { input }, context) => {
      const usuario = exigirProfessor(context);
      const matricula = await buscarMatriculaDoProfessor(input.matriculaId, usuario);
      validarOpcao(input.tipo, TIPOS, 'Tipo de feedback');
      const textoEditado = validarTexto(input.texto);
      await validarFeedbackUnico(matricula._id, input.tipo);

      return executarNoBanco(() => Feedback.create({
        matriculaId: matricula._id,
        tipo: input.tipo,
        textoEditado,
        geradoPorIA: false,
        statusEnvio: 'rascunho',
        status: 'ativo',
      }));
    },

    editarFeedback: async (_parent, { id, texto }, context) => {
      const usuario = exigirProfessor(context);
      const feedback = await buscarFeedbackDoProfessor(id, usuario);
      exigirAtivo(feedback);
      if (feedback.statusEnvio === 'enviado') {
        throw erro('Desmarque o envio antes de editar o feedback.', 'CONFLICT');
      }
      feedback.textoEditado = validarTexto(texto);
      await executarNoBanco(() => feedback.save());
      return feedback;
    },

    marcarFeedbackEnviado: async (_parent, { id }, context) => {
      return alterarEnvio(id, exigirProfessor(context), 'enviado');
    },

    desmarcarFeedbackEnviado: async (_parent, { id }, context) => {
      return alterarEnvio(id, exigirProfessor(context), 'rascunho');
    },

    arquivarFeedback: async (_parent, { id }, context) => {
      const usuario = exigirProfessor(context);
      const feedback = await buscarFeedbackDoProfessor(id, usuario);
      feedback.status = 'arquivado';
      await executarNoBanco(() => feedback.save());
      return feedback;
    },

    restaurarFeedback: async (_parent, { id }, context) => {
      const usuario = exigirProfessor(context);
      const feedback = await buscarFeedbackDoProfessor(id, usuario);
      await validarFeedbackUnico(feedback.matriculaId, feedback.tipo, feedback._id);
      feedback.status = 'ativo';
      await executarNoBanco(() => feedback.save());
      return feedback;
    },
  },

  Feedback: {
    matricula: async (feedback, _args, context) => {
      const usuario = exigirProfessor(context);
      return buscarMatriculaDoProfessor(feedback.matriculaId, usuario);
    },
  },
};

module.exports = feedbackResolvers;
