const { GraphQLError } = require('graphql');

const TEMPERATURA = 0.3;
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 0;
const LIMITES_SAIDA = Object.freeze({ mensagemDiaria: 300, feedback: 900 });

function erro(mensagem, code) {
  return new GraphQLError(mensagem, { extensions: { code } });
}

async function gerarTexto(prompt = {}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !model) {
    throw erro('Serviço de IA não configurado.', 'IA_NOT_CONFIGURED');
  }

  const { system, user, modalidade = 'feedback' } = prompt || {};
  if (
    typeof system !== 'string' || !system.trim() ||
    typeof user !== 'string' || !user.trim() ||
    typeof modalidade !== 'string' ||
    !Object.hasOwn(LIMITES_SAIDA, modalidade)
  ) {
    throw erro('Solicitação de geração inválida.', 'BAD_USER_INPUT');
  }

  try {
    // O SDK e o cliente só são carregados quando uma geração válida é solicitada.
    const OpenAI = require('openai');
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.openai.com/v1',
      timeout: TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    });
    const resposta = await client.responses.create({
      model,
      instructions: system,
      input: user,
      temperature: TEMPERATURA,
      max_output_tokens: LIMITES_SAIDA[modalidade],
      store: false,
    });
    const texto = resposta?.output_text;
    const recusada = resposta?.output?.some(item =>
      item.content?.some(parte => parte.type === 'refusal')
    );
    if (resposta?.status !== 'completed' || recusada || typeof texto !== 'string' || !texto.trim()) {
      throw new Error('Saída de IA inválida.');
    }
    return texto.trim();
  } catch {
    throw erro('Não foi possível gerar o texto neste momento.', 'IA_UNAVAILABLE');
  }
}

module.exports = { gerarTexto, TEMPERATURA, TIMEOUT_MS, MAX_RETRIES, LIMITES_SAIDA };
