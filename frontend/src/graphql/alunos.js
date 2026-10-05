import { gql } from '@apollo/client';

// Consulta mínima da Fase 1: lista os cadastros do professor autenticado.
// A Fase 3 (Ramon) deve ampliar este arquivo com criarAluno, atualizarAluno,
// matriculas, etc., reutilizando MEUS_ALUNOS quando fizer sentido.
export const MEUS_ALUNOS = gql`
  query MeusAlunos($status: String) {
    meusAlunos(status: $status) {
      id
      nome
      generoGramatical
      nomeResponsavel
      status
    }
  }
`;
