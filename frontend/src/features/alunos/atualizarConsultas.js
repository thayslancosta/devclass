const CONSULTAS_DE_ALUNOS = new Set(['MeusAlunos', 'Aluno', 'AlunosDaTurma']);

// Refaz as consultas de alunos que estiverem montadas (Meus alunos, alunos da
// turma e perfil) depois de uma mutation do domínio. A mutation já foi
// persistida quando esta função roda: uma falha aqui aparece no estado de erro
// da própria consulta, sem transformar a operação em erro.
export async function atualizarConsultasDeAlunos(client) {
  try {
    await client.refetchQueries({
      include: 'active',
      onQueryUpdated: (consulta) => CONSULTAS_DE_ALUNOS.has(consulta.queryName),
    });
  } catch {
    // Tratado pelas telas que exibem cada consulta.
  }
}
