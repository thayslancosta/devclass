const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');

const Aluno = require('../../models/Aluno');
const Matricula = require('../../models/Matricula');
const Turma = require('../../models/Turma');

const GENEROS = ['masculino', 'feminino', 'neutro'];
const FILTROS_MATRICULA = ['ativa', 'encerrada', 'todas'];
const FILTROS_CADASTRO = ['ativo', 'inativo', 'todos'];

// Erros seguem os códigos canônicos da especificação (seção 11.8).
// Nenhuma mensagem devolve stacktrace nem detalhe interno do MongoDB.
function erro(mensagem, code) {
  return new GraphQLError(mensagem, { extensions: { code } });
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

// Converte string vazia / só espaços / null em undefined.
function normalizarOpcional(valor) {
  if (valor === null || valor === undefined) {
    return undefined;
  }

  if (typeof valor !== 'string') {
    throw erro('Os dados do responsável devem ser texto.', 'BAD_USER_INPUT');
  }

  const limpo = valor.trim();

  return limpo.length === 0 ? undefined : limpo;
}

function validarNomeObrigatorio(nome) {
  if (typeof nome !== 'string' || nome.trim().length === 0) {
    throw erro('O nome do aluno é obrigatório.', 'BAD_USER_INPUT');
  }

  return nome.trim();
}

function validarGenero(genero, rotulo) {
  if (!GENEROS.includes(genero)) {
    throw erro(
      `Gênero ${rotulo} inválido. Use masculino, feminino ou neutro.`,
      'BAD_USER_INPUT'
    );
  }

  return genero;
}

// Regra de responsável: o aluno pode existir sem responsável, mas se
// gênero ou contato do responsável forem informados, o nome é obrigatório.
function validarCoerenciaResponsavel(dados) {
  const temDadoDependente =
    dados.generoResponsavel !== undefined ||
    dados.contatoResponsavel !== undefined;

  if (temDadoDependente && dados.nomeResponsavel === undefined) {
    throw erro(
      'Informe o nome do responsável quando gênero ou contato do responsável forem preenchidos.',
      'BAD_USER_INPUT'
    );
  }

  if (dados.generoResponsavel !== undefined) {
    validarGenero(dados.generoResponsavel, 'do responsável');
  }
}

// Valida o filtro de status de CADASTRO (usado em meusAlunos).
// Diferente de FILTROS_MATRICULA, que filtra a situação da matrícula.
function validarStatusCadastro(status) {
  const filtro = status === undefined || status === null ? 'ativo' : status;

  if (!FILTROS_CADASTRO.includes(filtro)) {
    throw erro(
      "Status de cadastro inválido. Use 'ativo', 'inativo' ou 'todos'.",
      'BAD_USER_INPUT'
    );
  }

  return filtro;
}

// Carrega o aluno garantindo que ele pertence ao professor autenticado.
// A mensagem é sempre a mesma para não revelar a existência de recurso alheio.
async function buscarAlunoDoProfessor(id, usuario) {
  validarId(id, 'do aluno');

  const aluno = await Aluno.findOne({
    _id: id,
    professorId: usuario.id,
  });

  if (!aluno) {
    throw erro(
      'Aluno não encontrado ou não pertence ao usuário.',
      'NOT_FOUND'
    );
  }

  return aluno;
}

async function alterarStatus(id, usuario, status) {
  const aluno = await buscarAlunoDoProfessor(id, usuario);

  aluno.status = status;

  await aluno.save();

  return aluno;
}

const alunoResolvers = {
  Query: {
    aluno: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);

      validarId(id, 'do aluno');

      // Escopo por professor: professor A nunca enxerga aluno de B.
      return Aluno.findOne({
        _id: id,
        professorId: usuario.id,
      });
    },

    alunosDaTurma: async (_parent, { turmaId, status }, context) => {
      const usuario = exigirUsuario(context);

      validarId(turmaId, 'da turma');

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

      // Padrão da especificação: a turma mostra os alunos com matrícula ativa.
      // O histórico é solicitado explicitamente via status.
      const filtroStatus =
        status === undefined || status === null ? 'ativa' : status;

      if (!FILTROS_MATRICULA.includes(filtroStatus)) {
        throw erro(
          "Status de matrícula inválido. Use 'ativa', 'encerrada' ou 'todas'.",
          'BAD_USER_INPUT'
        );
      }

      const filtroMatricula = { turmaId: turma._id };

      if (filtroStatus !== 'todas') {
        filtroMatricula.status = filtroStatus;
      }

      const matriculas = await Matricula.find(filtroMatricula);

      if (matriculas.length === 0) {
        return [];
      }

      return Aluno.find({
        _id: { $in: matriculas.map((matricula) => matricula.alunoId) },
        professorId: usuario.id,
      }).sort({ nome: 1 });
    },

    // Lista independente de turma: todos os cadastros do professor,
    // usada pela tela "Meus alunos" do frontend (Fase 1).
    meusAlunos: async (_parent, { status }, context) => {
      const usuario = exigirUsuario(context);

      const filtroStatus = validarStatusCadastro(status);

      const filtro = { professorId: usuario.id };

      if (filtroStatus !== 'todos') {
        filtro.status = filtroStatus;
      }

      return Aluno.find(filtro).sort({ nome: 1 });
    },
  },

  Mutation: {
    criarAluno: async (_parent, { input }, context) => {
      const usuario = exigirUsuario(context);

      const dados = {
        nome: validarNomeObrigatorio(input.nome),
        generoGramatical: validarGenero(input.generoGramatical, 'gramatical'),
        nomeResponsavel: normalizarOpcional(input.nomeResponsavel),
        generoResponsavel: normalizarOpcional(input.generoResponsavel),
        contatoResponsavel: normalizarOpcional(input.contatoResponsavel),
      };

      validarCoerenciaResponsavel(dados);

      // professorId sempre vem do contexto autenticado, nunca do cliente.
      return Aluno.create({
        ...dados,
        professorId: usuario.id,
        status: 'ativo',
      });
    },

    atualizarAluno: async (_parent, { id, input }, context) => {
      const usuario = exigirUsuario(context);

      const aluno = await buscarAlunoDoProfessor(id, usuario);

      if (input.nome !== undefined) {
        aluno.nome = validarNomeObrigatorio(input.nome);
      }

      if (input.generoGramatical !== undefined) {
        aluno.generoGramatical = validarGenero(
          input.generoGramatical,
          'gramatical'
        );
      }

      if (input.nomeResponsavel !== undefined) {
        aluno.nomeResponsavel = normalizarOpcional(input.nomeResponsavel);
      }

      if (input.generoResponsavel !== undefined) {
        aluno.generoResponsavel = normalizarOpcional(input.generoResponsavel);
      }

      if (input.contatoResponsavel !== undefined) {
        aluno.contatoResponsavel = normalizarOpcional(
          input.contatoResponsavel
        );
      }

      // Valida o estado final do aluno, não apenas o que veio no input.
      validarCoerenciaResponsavel({
        nomeResponsavel: aluno.nomeResponsavel ?? undefined,
        generoResponsavel: aluno.generoResponsavel ?? undefined,
        contatoResponsavel: aluno.contatoResponsavel ?? undefined,
      });

      // professorId é preservado: nunca é alterado por input do cliente.
      await aluno.save();

      return aluno;
    },

    // Exclusão lógica: o aluno e o histórico de matrículas continuam existindo.
    inativarAluno: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);

      return alterarStatus(id, usuario, 'inativo');
    },

    reativarAluno: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);

      return alterarStatus(id, usuario, 'ativo');
    },
  },

  Aluno: {
    // Só executa quando o cliente pede o campo matriculas.
    matriculas: async (aluno) =>
      Matricula.find({ alunoId: aluno._id }).sort({
        periodoLetivo: -1,
        createdAt: -1,
      }),
  },
};

module.exports = alunoResolvers;
