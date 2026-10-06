import { interrompeSequencia, mensagemFeedback } from './feedbackUtils';

export async function executarSequencia({ ids, gerar, atualizar, resultado, continua }) {
  for (const [indice, id] of ids.entries()) {
    if (!continua()) break;
    resultado(id, { estado: 'Gerando' });
    try {
      await gerar(id);
      if (!continua()) break;
      resultado(id, { estado: 'Concluído' });
    } catch (erro) {
      if (!continua()) break;
      resultado(id, { estado: 'Falha', mensagem: mensagemFeedback(erro) });
      // Mesmo com resposta perdida, a mutation pode ter persistido. Reconciliar
      // antes de permitir uma nova solicitação explícita; nunca repetir a IA.
      let interromper = interrompeSequencia(erro);
      try { await atualizar(id); } catch { interromper = true; }
      if (interromper) {
        for (const restante of ids.slice(indice + 1)) {
          resultado(restante, { estado: 'Interrompido', mensagem: 'Sequência interrompida por falha de sessão, serviço ou consulta. Nenhuma chamada realizada.' });
        }
        return;
      }
      continue;
    }
    try {
      await atualizar(id);
    } catch {
      resultado(id, { estado: 'Concluído', mensagem: 'Texto salvo, mas a consulta falhou. Atualize a lista antes de continuar.' });
      for (const restante of ids.slice(indice + 1)) {
        resultado(restante, { estado: 'Interrompido', mensagem: 'Não foi possível consultar o estado atual.' });
      }
      return;
    }
  }
}
