# DevClass — Especificação técnica do módulo de Feedback e IA

## 1. Finalidade do documento

Este documento define o escopo funcional, as regras de negócio, os contratos GraphQL, a persistência, a integração com IA, os requisitos de segurança e os critérios de aceitação da fase final do backend DevClass.

Ele deve ser suficiente para que uma pessoa ou um agente de programação implemente o módulo sem depender do histórico da conversa. Em caso de conflito entre este documento e suposições do implementador, prevalece este documento. O código existente e os contratos já testados das fases 1 a 4 devem permanecer compatíveis.

## 2. Contexto do produto

O DevClass é um diário de evolução pedagógica para uma escola de línguas. O professor administra turmas semestrais, alunos, matrículas, aulas e registros diários. A aplicação usa esses dados para produzir, somente quando solicitado, mensagens pedagógicas com auxílio de IA.

O sistema não substitui o julgamento do professor. Todo conteúdo gerado é um rascunho revisável. O envio ao aluno ou responsável ocorre fora da aplicação e é confirmado manualmente pelo professor.

## 3. Estado atual do backend

As fases anteriores já implementam:

- autenticação e administração em REST;
- JWT com validação do usuário no banco;
- autorização por perfil;
- turmas e períodos letivos em GraphQL;
- alunos, responsáveis e matrículas em GraphQL;
- aulas e registros diários em GraphQL;
- arquivamento lógico e preservação de histórico;
- isolamento dos dados por professor;
- datas estritas no formato `AAAA-MM-DD`;
- prevenção de aula ativa duplicada por turma/data;
- prevenção de registro ativo duplicado por aula/matrícula;
- coleção Postman oficial na raiz do projeto.

Arquitetura atual:

- Node.js com CommonJS;
- Express 5;
- MongoDB Atlas com Mongoose;
- Apollo Server 5 e GraphQL;
- `bcryptjs` e `jsonwebtoken`;
- SDK `openai` já presente nas dependências;
- REST para autenticação/administração;
- GraphQL para o domínio pedagógico.

## 4. Escopo desta fase

Esta fase implementará:

1. feedback semestral parcial e final;
2. seleção de um ou mais alunos para geração de feedback;
3. geração sob demanda com IA;
4. criação manual de feedback como alternativa operacional e demonstrável;
5. edição do texto antes do envio;
6. confirmação manual de envio;
7. reversão da confirmação de envio;
8. consulta de feedbacks enviados e pendentes;
9. arquivamento e restauração, sem exclusão física;
10. geração opcional de mensagem diária a partir de um registro existente;
11. integração segura com a OpenAI;
12. testes no Postman e documentação final.

## 5. Fora do escopo

Não implementar nesta entrega:

- frontend ou dashboard visual;
- envio automático por email, WhatsApp, SMS ou outro canal;
- relatórios bimestrais;
- agendamentos automáticos;
- geração automática ao criar aula ou registro;
- pagamentos, frequência, notas ou boletins formais;
- upload de arquivos;
- múltiplos estilos de escrita por professor;
- treinamento ou fine-tuning de modelo;
- análise clínica, psicológica ou diagnóstica;
- exclusão física de entidades;
- implantação em produção.

## 6. Decisões funcionais

### 6.1 Registro diário

O registro diário continua opcional. Há aulas em que nada notável precisa ser registrado. Um registro existente pode conter:

- observação geral;
- uma ou mais avaliações por habilidade;
- ou ambos.

Habilidades permitidas:

- `speaking`;
- `listening`;
- `reading`;
- `writing`;
- `grammar`;
- `vocabulary`;
- `pronunciation`;
- `participation`;
- `outra`, acompanhada de `outraDescricao`.

Desempenhos permitidos:

- `destaque`;
- `adequado`;
- `precisa_de_atencao`.

### 6.2 Mensagem diária

A mensagem diária:

- só é gerada quando o professor chama a mutation correspondente;
- usa apenas um registro diário já existente;
- pode usar tópicos da aula, se cadastrados;
- usa observação geral e avaliações do registro;
- é criada como rascunho editável;
- não é enviada automaticamente;
- pode ser regenerada enquanto o registro estiver ativo e sua estrutura operacional estiver ativa;
- ao regenerar, substitui `mensagemIAOriginal`, `mensagemEditada` e `geradaEm`;
- preserva o comportamento atual de `editarMensagemDiaria`.

### 6.3 Feedback semestral

Existem dois tipos:

- `parcial`: normalmente usado no meio do semestre;
- `final`: normalmente usado ao fim do semestre.

Não existem datas fixas no modelo. O professor decide quando gerar cada tipo.

Para cada matrícula, pode existir no máximo um feedback ativo de cada tipo. Assim, uma matrícula pode ter simultaneamente um feedback parcial ativo e um feedback final ativo.

O feedback pertence à matrícula, e não diretamente ao aluno. Isso preserva o contexto do semestre e permite que o mesmo aluno tenha feedbacks distintos em matrículas futuras.

### 6.4 Seleção de alunos

A geração por IA aceita uma lista de `matriculaIds`. O professor pode selecionar um, vários ou todos os alunos de uma turma. A seleção é explícita; nenhuma geração ocorre por varredura automática.

Antes de chamar a IA, o backend deve validar toda a lista:

- autenticação;
- perfil de professor;
- formato e unicidade dos IDs recebidos;
- existência das matrículas;
- propriedade das matrículas pelo professor autenticado;
- existência dos alunos e das turmas relacionadas;
- existência de registros pedagógicos utilizáveis;
- ausência de feedback ativo e enviado que impediria regeneração.

Se qualquer item for inválido, a mutation deve falhar antes de chamar a IA e antes de persistir qualquer novo feedback.

### 6.5 Turmas e matrículas encerradas

Feedback parcial ou final pode ser criado, consultado, editado e marcado como enviado mesmo depois de a turma ou a matrícula ser encerrada. Essa é uma exceção intencional às regras operacionais dos registros diários: o feedback é uma consolidação histórica e pode ser finalizado após o encerramento do semestre.

A propriedade do recurso continua obrigatória. Encerramento não torna dados de outro professor acessíveis.

### 6.6 Estado de envio

O envio real ocorre fora do backend. O backend apenas registra a confirmação manual.

Estados de envio:

- `rascunho`: ainda não confirmado como enviado;
- `enviado`: confirmação manual concluída.

Regras:

- novos feedbacks começam como `rascunho`;
- marcar como enviado define `statusEnvio = enviado` e `enviadoEm` com o instante atual;
- desmarcar envio retorna para `rascunho` e limpa `enviadoEm`;
- feedback enviado não pode ser editado nem regenerado até ser desmarcado;
- repetir a mesma transição pode ser idempotente: marcar um já enviado mantém o estado; desmarcar um já em rascunho mantém o estado;
- arquivar não apaga os textos nem os timestamps.

### 6.7 Arquivamento e restauração

`status` representa o ciclo de vida do documento:

- `ativo`;
- `arquivado`.

Regras:

- não haverá mutation de exclusão;
- arquivamento deve funcionar independentemente de turma/matrícula encerrada;
- restauração deve verificar se já existe outro feedback ativo do mesmo tipo para a mesma matrícula;
- conflito de restauração retorna `CONFLICT`;
- consultas históricas devem permitir incluir arquivados.

## 7. Modelo de dados `Feedback`

Criar `src/models/Feedback.js` com `timestamps: true`.

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `matriculaId` | ObjectId ref `Matricula` | sim | contexto semestral do feedback |
| `tipo` | String enum | sim | `parcial` ou `final` |
| `textoIAOriginal` | String | não | saída bruta aprovada pelo serviço de IA |
| `textoEditado` | String | sim | texto efetivamente apresentado e editável |
| `geradoPorIA` | Boolean | sim | padrão `false` |
| `geradoEm` | Date | não | preenchido somente em geração por IA |
| `statusEnvio` | String enum | sim | `rascunho` ou `enviado`; padrão `rascunho` |
| `enviadoEm` | Date | não | obrigatório apenas quando enviado |
| `status` | String enum | sim | `ativo` ou `arquivado`; padrão `ativo` |
| `createdAt` | Date | automático | timestamp Mongoose |
| `updatedAt` | Date | automático | timestamp Mongoose |

Validações no model:

- `textoEditado` deve ser textual e não vazio após `trim`;
- `textoIAOriginal`, quando presente, deve ser textual e não vazio após `trim`;
- `geradoPorIA = true` exige `textoIAOriginal` e `geradoEm`;
- `geradoPorIA = false` não deve inventar valores de IA;
- `statusEnvio = enviado` exige `enviadoEm`;
- `statusEnvio = rascunho` deve manter `enviadoEm` ausente;
- campos textuais devem usar `trim`.

Índice obrigatório:

```javascript
feedbackSchema.index(
  { matriculaId: 1, tipo: 1 },
  { unique: true, partialFilterExpression: { status: 'ativo' } }
);
```

O resolver também deve consultar conflito antes de criar/restaurar, mas o índice permanece a proteção contra concorrência. Erros MongoDB `11000` e `11001` devem ser convertidos em GraphQL `CONFLICT`, sem expor detalhes internos.

## 8. Contrato GraphQL

Criar `src/graphql/typeDefs/feedbackTypeDefs.js`.

### 8.1 Tipos

```graphql
type Feedback {
  id: ID!
  matriculaId: ID!
  matricula: Matricula
  tipo: String!
  textoIAOriginal: String
  textoEditado: String!
  geradoPorIA: Boolean!
  geradoEm: String
  statusEnvio: String!
  enviadoEm: String
  status: String!
  createdAt: String!
  updatedAt: String!
}

input CriarFeedbackManualInput {
  matriculaId: ID!
  tipo: String!
  texto: String!
}

input GerarFeedbacksInput {
  matriculaIds: [ID!]!
  tipo: String!
}
```

### 8.2 Queries

```graphql
extend type Query {
  feedback(id: ID!): Feedback
  feedbacks(
    matriculaId: ID!
    tipo: String
    statusEnvio: String
    status: String
  ): [Feedback!]!
}
```

Semântica:

- `feedback(id)` retorna `null` para recurso inexistente ou pertencente a outro professor, seguindo as consultas diretas atuais de aluno/turma;
- `feedbacks` exige que a matrícula pertença ao professor;
- filtro padrão: `status = ativo`;
- `status` aceita `ativo`, `arquivado`, `todos`;
- `tipo` aceita `parcial`, `final`;
- `statusEnvio` aceita `rascunho`, `enviado`;
- ordenação: `tipo`, depois `createdAt` decrescente, ou outra ordem determinística documentada.

### 8.3 Mutations

```graphql
extend type Mutation {
  criarFeedbackManual(input: CriarFeedbackManualInput!): Feedback!
  gerarFeedbacks(input: GerarFeedbacksInput!): [Feedback!]!
  editarFeedback(id: ID!, texto: String!): Feedback!
  marcarFeedbackEnviado(id: ID!): Feedback!
  desmarcarFeedbackEnviado(id: ID!): Feedback!
  arquivarFeedback(id: ID!): Feedback!
  restaurarFeedback(id: ID!): Feedback!
}
```

Adicionar ao tipo de registros:

```graphql
extend type Mutation {
  gerarMensagemDiaria(id: ID!): RegistroDiario!
}
```

O argumento `id` da mensagem diária é o ID de `RegistroDiario`.

## 9. Semântica das mutations

### 9.1 `criarFeedbackManual`

- autentica e exige professor;
- valida `matriculaId`, `tipo` e `texto`;
- confirma propriedade da matrícula;
- permite matrícula/turma ativa ou encerrada;
- impede outro feedback ativo do mesmo tipo/matrícula;
- cria com `geradoPorIA = false`, `statusEnvio = rascunho`, `status = ativo`;
- não preenche `textoIAOriginal` nem `geradoEm`;
- retorna `CONFLICT` para duplicidade.

### 9.2 `gerarFeedbacks`

- exige lista não vazia;
- remove duplicatas ou, preferencialmente, rejeita IDs repetidos com `BAD_USER_INPUT`;
- valida todos os recursos antes de chamar a IA;
- usa registros `ativos` da matrícula, mesmo que a aula ou turma já esteja arquivada/encerrada;
- exclui registros arquivados para não usar anotações descartadas;
- ordena evidências pela data da aula em ordem crescente;
- exige ao menos um registro ativo com conteúdo por matrícula;
- se não existir feedback ativo do tipo, cria um rascunho;
- se existir feedback ativo em rascunho, regenera e substitui os textos e `geradoEm`;
- se existir feedback ativo enviado, retorna `CONFLICT` antes de chamar a IA;
- primeiro gera todos os textos; somente depois inicia a persistência, reduzindo o risco de lote parcialmente salvo por falha do provedor;
- retorna os feedbacks na mesma ordem de `matriculaIds`.

### 9.3 `editarFeedback`

- valida texto textual e não vazio;
- confirma propriedade;
- permite turma/matrícula encerrada;
- exige feedback ativo;
- bloqueia feedback enviado com `CONFLICT` e orienta desmarcar o envio;
- altera apenas `textoEditado`.

### 9.4 Confirmações de envio

`marcarFeedbackEnviado`:

- exige feedback ativo;
- define `statusEnvio = enviado` e `enviadoEm`;
- não chama IA;
- não envia comunicação externa.

`desmarcarFeedbackEnviado`:

- exige feedback ativo;
- define `statusEnvio = rascunho`;
- remove `enviadoEm`;
- permite nova edição ou regeneração.

### 9.5 Arquivar e restaurar

- arquivar define `status = arquivado` sem apagar;
- restaurar define `status = ativo` se não houver conflito;
- ambas confirmam propriedade;
- restaurar converte duplicidade em `CONFLICT`;
- arquivar feedback enviado preserva `statusEnvio` e `enviadoEm`.

### 9.6 `gerarMensagemDiaria`

- autentica e exige professor;
- valida o ID do registro;
- confirma propriedade pela cadeia registro → aula/matrícula → turma;
- confirma que aula e matrícula pertencem à mesma turma;
- exige registro, aula, matrícula e turma ativos;
- carrega o aluno da matrícula;
- monta contexto sem `contatoResponsavel`;
- chama a IA somente após as validações;
- salva o texto retornado em `mensagemIAOriginal` e `mensagemEditada`;
- atualiza `geradaEm`;
- não altera observações ou avaliações.

## 10. Serviço de IA

Criar uma camada separada dos resolvers:

- `src/services/iaService.js`: cliente OpenAI, chamada ao modelo e tratamento de falhas;
- `src/services/promptService.js`: estilo fixo, montagem de contexto e prompts.

Não colocar prompt extenso diretamente em resolver.

### 10.1 Configuração

Usar:

- `OPENAI_API_KEY`;
- `OPENAI_MODEL`.

O cliente deve ser criado de forma tardia, apenas quando uma geração for solicitada. O servidor deve iniciar e todas as operações sem IA devem funcionar sem chave configurada.

Se chave ou modelo estiver ausente, retornar erro controlado:

- mensagem: `Serviço de IA não configurado.`;
- `extensions.code = IA_NOT_CONFIGURED`.

Falha do provedor:

- mensagem pública: `Não foi possível gerar o texto neste momento.`;
- `extensions.code = IA_UNAVAILABLE`;
- não devolver resposta bruta, chave, URL, stacktrace ou detalhes do provedor.

Saída vazia ou não textual também deve ser tratada como `IA_UNAVAILABLE`.

### 10.2 Política do prompt

O prompt fixo deve orientar o modelo a:

- escrever em português brasileiro;
- usar tom acolhedor, profissional, claro e específico;
- basear cada afirmação somente nas evidências recebidas;
- não inventar presença, notas, progresso, dificuldades ou acontecimentos;
- mencionar pontos fortes e pontos a desenvolver sem humilhação;
- transformar `precisa_de_atencao` em orientação construtiva;
- não comparar alunos;
- não produzir diagnóstico médico, psicológico ou comportamental;
- evitar promessas absolutas;
- respeitar nome e gênero gramatical do aluno;
- considerar nome e gênero do responsável quando disponíveis;
- não afirmar que a mensagem foi enviada;
- retornar apenas o texto final, sem título técnico, JSON, Markdown ou explicações sobre IA.

O estilo é único e fixo para todos os professores nesta primeira versão. O texto exato do estilo pode ser refinado depois com exemplos reais do professor, sem alterar os contratos do módulo.

### 10.3 Dados permitidos no prompt

Permitidos:

- nome do aluno;
- gênero gramatical do aluno;
- nome do responsável, se houver;
- gênero do responsável, se houver;
- nome, estágio e período da turma;
- tipo de feedback;
- data e tópicos das aulas;
- observação geral;
- habilidade, desempenho, observação e descrição de habilidade personalizada.

Proibidos:

- `contatoResponsavel`;
- email do professor;
- senha ou hash;
- JWT;
- IDs MongoDB;
- connection string;
- chave da OpenAI;
- campos internos sem utilidade pedagógica.

### 10.4 Limites de contexto

Para evitar requisições excessivas:

- normalizar espaços e remover valores vazios;
- limitar cada observação textual a tamanho razoável, por exemplo 1.000 caracteres;
- limitar o conjunto a, no máximo, 40 registros ativos por feedback;
- se houver mais de 40, selecionar os 40 mais recentes e informar ao prompt que representam o recorte disponível;
- manter ordenação cronológica no texto enviado;
- definir limite de saída compatível com uma mensagem curta para registro diário e um feedback mais completo para parcial/final.

Os limites exatos devem ficar como constantes nomeadas, não números dispersos.

## 11. Segurança e privacidade

Requisitos obrigatórios:

- nunca confiar em `professorId` vindo do cliente;
- derivar identidade exclusivamente de `context.usuario`;
- verificar propriedade antes de verificar estados ou revelar detalhes;
- responder `NOT_FOUND` para recurso de outro professor;
- nunca enviar `contatoResponsavel` à IA;
- nunca registrar prompts completos com dados pessoais em logs;
- nunca expor chave, token, URI, senha, stacktrace ou erro bruto;
- não ler, imprimir ou alterar `.env` durante implementação automatizada;
- manter `.env` ignorado pelo Git;
- não adicionar valores sensíveis à coleção Postman;
- não persistir prompt completo; persistir apenas os textos gerados e metadados necessários;
- não executar exclusão física.

## 12. Códigos de erro GraphQL

| Código | Uso |
| --- | --- |
| `UNAUTHENTICATED` | token ausente, inválido ou usuário inativo |
| `FORBIDDEN` | perfil sem permissão pedagógica |
| `BAD_USER_INPUT` | ID/formato/lista/tipo/status/texto inválido ou ausência de evidências |
| `NOT_FOUND` | recurso inexistente ou de outro professor em mutations/listas protegidas |
| `CONFLICT` | duplicidade, edição/regeneração de feedback enviado ou restauração conflitante |
| `IA_NOT_CONFIGURED` | chave ou modelo ausente |
| `IA_UNAVAILABLE` | falha ou saída inválida do provedor |

Todas as mensagens devem ser controladas e sem stacktrace na resposta.

## 13. Integração no schema

Modificar `src/graphql/schema.js` para:

- importar `feedbackTypeDefs` e `feedbackResolvers`;
- adicionar typeDefs ao array;
- mesclar `feedbackResolvers.Query`;
- mesclar `feedbackResolvers.Mutation`;
- registrar resolver relacional `Feedback.matricula`;
- formatar `createdAt`, `updatedAt`, `geradoEm` e `enviadoEm` como ISO;
- preservar todos os resolvers existentes;
- preservar o contexto JWT e `stacktrace: false` do servidor.

## 14. Requisitos de compatibilidade

A implementação não pode:

- alterar nomes ou semântica das operações existentes;
- quebrar as 112 requisições principais já definidas na coleção;
- migrar o projeto para ESM ou TypeScript;
- trocar Express, Apollo, Mongoose ou a estratégia JWT;
- mudar as regras de datas, duplicidades ou estados já aprovadas;
- adicionar `delete` físico;
- exigir OpenAI para iniciar o servidor;
- alterar dependências sem necessidade demonstrada;
- criar endpoint REST para o domínio de feedback.

## 15. Critérios de aceitação

O módulo está funcionalmente aceito quando:

- feedback manual parcial e final podem ser criados;
- duplicidade ativa por matrícula/tipo é impedida no resolver e no índice;
- feedbacks podem ser listados por status, tipo e estado de envio;
- texto pode ser editado enquanto estiver em rascunho;
- envio pode ser marcado e desmarcado manualmente;
- documentos podem ser arquivados e restaurados sem perda de histórico;
- feedback enviado não pode ser editado ou regenerado sem desmarcar;
- uma seleção de matrículas pode gerar feedbacks em lote;
- geração usa apenas dados do professor autenticado;
- geração funciona para semestre encerrado;
- ausência de dados pedagógicos é rejeitada;
- mensagem diária é gerada somente sob solicitação;
- contato do responsável não chega ao serviço de IA;
- ausência de configuração da IA não impede o servidor ou CRUD manual;
- falhas da IA geram resposta controlada;
- todas as datas retornadas estão em ISO;
- Postman demonstra caminho de sucesso, validações, autorização, histórico e falha controlada;
- README descreve apenas funcionalidades efetivamente implementadas.

## 16. Definição de pronto

Além dos critérios funcionais:

- todos os arquivos JavaScript passam em `node --check`;
- `git diff --check` não apresenta erro;
- não há segredo versionado;
- não há diretórios Postman duplicados;
- a coleção JSON é válida;
- código novo segue CommonJS e o estilo existente;
- testes essenciais são executados contra o MongoDB de desenvolvimento;
- o diff é revisado antes de commit;
- commit e push só ocorrem após aprovação explícita do responsável pela integração.
