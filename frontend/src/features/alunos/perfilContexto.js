export function contextoPerfil(matriculas, params, periodo) {
  const explicita = params.get('matricula');
  const selecionada = explicita ? matriculas.find((m) => m.id === explicita) || null
    : matriculas.find((m) => m.periodoLetivo === periodo) || matriculas[0] || null;
  const aba = ['registros', 'feedbacks', 'dados'].includes(params.get('aba')) ? params.get('aba')
    : params.has('feedback') ? 'feedbacks' : 'registros';
  return { selecionada, aba, historicoImplicito: !explicita && selecionada && selecionada.periodoLetivo !== periodo };
}
