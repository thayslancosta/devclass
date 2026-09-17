const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');

const Aluno = require('../../models/Aluno');
const Matricula = require('../../models/Matricula');
const Turma = require('../../models/Turma');

// Erros seguem os códigos canônicos da especificação (seção 11.8).
function erro(mensagem, code) {
  return new GraphQLError(mensagem, { extensions: { code } });
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

// Erro 11000 do MongoDB nunca vai bruto para o cliente.
function ehConflitoDeIndice(e) {
  return Boolean(e) && (e.code === 11000 || e.code === 11001);
}

const matriculaResolvers = {
  Mutation: {
    matricularAluno: async (_parent, { alunoId, turmaId }, context) => {
      const usuario = exigirUsuario(context);

      validarId(alunoId, 'do aluno');
      validarId(turmaId, 'da turma');

      // Aluno e turma precisam pertencer ao professor autenticado.
      const [aluno, turma] = await Promise.all([
        Aluno.findOne({ _id: alunoId, professorId: usuario.id }),
        Turma.findOne({ _id: turmaId, professorId: usuario.id }),
      ]);

      if (!aluno) {
        throw erro(
          'Aluno não encontrado ou não pertence ao usuário.',
          'NOT_FOUND'
        );
      }

      if (!turma) {
        throw erro(
          'Turma não encontrada ou não pertence ao usuário.',
          'NOT_FOUND'
        );
      }

      if (aluno.status !== 'ativo') {
        throw erro(
          'Não é possível matricular um aluno inativo. Reative o aluno antes.',
          'BAD_USER_INPUT'
        );
      }

      if (turma.status !== 'ativa') {
        throw erro(
          'Não é possível matricular em uma turma encerrada.',
          'BAD_USER_INPUT'
        );
      }

      // O período letivo é sempre copiado da turma, nunca escolhido pelo cliente.
      const periodoLetivo = turma.periodoLetivo;

      const existente = await Matricula.findOne({
        alunoId: aluno._id,
        periodoLetivo,
      });

      if (existente) {
        if (existente.turmaId.equals(turma._id)) {
          throw erro(
            `Este aluno já possui matrícula nesta turma no período letivo ${periodoLetivo}.`,
            'CONFLICT'
          );
        }

        throw erro(
          `Este aluno já possui matrícula em outra turma no período letivo ${periodoLetivo}. Um aluno só pode estar em uma turma por semestre.`,
          'CONFLICT'
        );
      }

      try {
        return await Matricula.create({
          alunoId: aluno._id,
          turmaId: turma._id,
          periodoLetivo,
          status: 'ativa',
        });
      } catch (e) {
        // Corrida entre duas requisições simultâneas cai no índice único.
        if (ehConflitoDeIndice(e)) {
          throw erro(
            `Este aluno já possui matrícula no período letivo ${periodoLetivo}. Um aluno só pode estar em uma turma por semestre.`,
            'CONFLICT'
          );
        }

        throw erro(
          'Não foi possível criar a matrícula.',
          'INTERNAL_SERVER_ERROR'
        );
      }
    },

    // Exclusão lógica: o documento da matrícula é preservado.
    encerrarMatricula: async (_parent, { id }, context) => {
      const usuario = exigirUsuario(context);

      validarId(id, 'da matrícula');

      const matricula = await Matricula.findById(id);

      const mensagemPadrao =
        'Matrícula não encontrada ou não pertence ao usuário.';

      if (!matricula) {
        throw erro(mensagemPadrao, 'NOT_FOUND');
      }

      // Propriedade validada pelo aluno dono da matrícula.
      const aluno = await Aluno.findOne({
        _id: matricula.alunoId,
        professorId: usuario.id,
      });

      if (!aluno) {
        throw erro(mensagemPadrao, 'NOT_FOUND');
      }

      matricula.status = 'encerrada';

      await matricula.save();

      return matricula;
    },
  },

  Matricula: {
    aluno: async (matricula) => Aluno.findById(matricula.alunoId),
    turma: async (matricula) => Turma.findById(matricula.turmaId),
  },
};

module.exports = matriculaResolvers;
