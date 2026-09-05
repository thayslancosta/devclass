const Aula = require('../../models/Aula');
const Turma = require('../../models/Turma');

const aulaResolvers = {
  Query: {
    aulas: async (_, { turmaId, dataInicio, dataFim, status }, { usuario }) => {
      if (!usuario) {
        throw new Error('Usuário não autenticado.');
      }

      const turma = await Turma.findOne({
        _id: turmaId,
        professorId: usuario.id,
      });

      if (!turma) {
        throw new Error('Turma não encontrada ou não pertence ao professor.');
      }

      const filtro = {
        turmaId,
      };

      if (status) {
        filtro.status = status;
      }

      if (dataInicio || dataFim) {
        filtro.data = {};

        if (dataInicio) {
          filtro.data.$gte = new Date(dataInicio);
        }

        if (dataFim) {
          filtro.data.$lte = new Date(dataFim);
        }
      }

      return Aula.find(filtro).sort({ data: -1 });
    },
  },

  Mutation: {
    criarAula: async (_, { input }, { usuario }) => {
      if (!usuario) {
        throw new Error('Usuário não autenticado.');
      }

      const turma = await Turma.findOne({
        _id: input.turmaId,
        professorId: usuario.id,
      });

      if (!turma) {
        throw new Error('Turma não encontrada ou não pertence ao professor.');
      }

      const aula = await Aula.create({
        turmaId: input.turmaId,
        data: new Date(input.data),
        topicos: input.topicos || [],
      });

      return aula;
    },

    atualizarAula: async (_, { id, input }, { usuario }) => {
      if (!usuario) {
        throw new Error('Usuário não autenticado.');
      }

      const aula = await Aula.findById(id);

      if (!aula) {
        throw new Error('Aula não encontrada.');
      }

      const turma = await Turma.findOne({
        _id: aula.turmaId,
        professorId: usuario.id,
      });

      if (!turma) {
        throw new Error('Aula não pertence a uma turma do professor.');
      }

      if (input.data !== undefined) {
        aula.data = new Date(input.data);
      }

      if (input.topicos !== undefined) {
        aula.topicos = input.topicos;
      }

      await aula.save();

      return aula;
    },

    arquivarAula: async (_, { id }, { usuario }) => {
      if (!usuario) {
        throw new Error('Usuário não autenticado.');
      }

      const aula = await Aula.findById(id);

      if (!aula) {
        throw new Error('Aula não encontrada.');
      }

      const turma = await Turma.findOne({
        _id: aula.turmaId,
        professorId: usuario.id,
      });

      if (!turma) {
        throw new Error('Aula não pertence a uma turma do professor.');
      }

      aula.status = 'arquivada';

      await aula.save();

      return aula;
    },
  },
};

module.exports = aulaResolvers;