# DevClass — Plano de execução para Codex: Feedback e IA

## 1. Contrato de execução

Implemente a fase final do backend DevClass usando como fonte de verdade o arquivo `01_ESPECIFICACAO_TECNICA_FEEDBACK_IA_DEVCLASS.md`.

Trabalhe por checkpoints estritos. Em cada checkpoint:

1. confirme a branch atual;
2. inspecione os arquivos relevantes antes de editar;
3. altere somente os arquivos autorizados;
4. preserve alterações preexistentes e não relacionadas;
5. faça validações estáticas e testes locais cabíveis;
6. apresente resumo, lista de arquivos, resultados e diff exclusivo;
7. pare e aguarde aprovação antes de iniciar o checkpoint seguinte.

Não faça commit, push, merge, rebase, instalação ou atualização de dependências sem autorização explícita. Não leia, imprima ou modifique `.env`. Não use comandos destrutivos. Não remova dados do MongoDB. Não altere a arquitetura das fases 1 a 4.

## 2. Premissas obrigatórias

- Repositório: `devclass-backend`.
- Branch esperada: `correcao-integracao-thayslan`.
- Módulos CommonJS com `require`/`module.exports`.
- REST permanece em autenticação e administração.
- Feedback e IA são GraphQL.
- OpenAI já consta em `package.json`; não reinstalar.
- Coleção oficial: `DevClass Backend.postman_collection.json` na raiz.
- Diretórios `.postman/` e `postman/` foram removidos e não devem ser recriados.
- Não existe exclusão física.
- A IA só é chamada por mutations explícitas.
- A falta de chave da OpenAI não pode impedir o servidor de iniciar.

## 3. Comandos-base de verificação

Use no início:

```bash
git branch --show-current
git status --short
```

Use ao final de checkpoints com JavaScript:

```bash
find src -name '*.js' -print0 | xargs -0 -n1 node --check
git diff --check
git status --short
```

Use ao alterar a coleção:

```bash
jq empty "DevClass Backend.postman_collection.json"
git diff --check
```

Não execute `git add`, `git commit` ou `git push` nos checkpoints intermediários.

## 4. Checkpoint 1 — Domínio de Feedback sem IA

### Objetivo

Implementar persistência, contratos GraphQL e CRUD lógico de feedback manual. A entrega deve funcionar sem `OPENAI_API_KEY`.

### Arquivos autorizados

- criar `src/models/Feedback.js`;
- criar `src/graphql/typeDefs/feedbackTypeDefs.js`;
- criar `src/graphql/resolvers/feedbackResolvers.js`;
- modificar `src/graphql/schema.js`.

Nenhum outro arquivo pode ser alterado neste checkpoint.

### Requisitos do model

Implemente exatamente os campos, enums, validações e índice parcial definidos na especificação.

O índice único deve proteger:

```text
uma combinação ativa de matriculaId + tipo
```

O tratamento de erro deve reconhecer `11000` e `11001`.

### Requisitos dos resolvers

Implemente:

- `feedback`;
- `feedbacks`;
- `criarFeedbackManual`;
- `editarFeedback`;
- `marcarFeedbackEnviado`;
- `desmarcarFeedbackEnviado`;
- `arquivarFeedback`;
- `restaurarFeedback`.

Não implemente `gerarFeedbacks` ainda; o typeDef pode ser adiado para o Checkpoint 3 para que o schema nunca anuncie uma operação sem resolver.

### Regras de autorização

Crie auxiliares locais coerentes com os resolvers existentes:

- `erro(mensagem, code)`;
- `exigirProfessor(context)`;
- `validarId(id, rotulo)`;
- `buscarMatriculaDoProfessor`;
- `buscarFeedbackDoProfessor`;
- validações de tipo, status, estado de envio e texto;
- validação/tratamento de duplicidade.

A cadeia de propriedade deve ser:

```text
Feedback → Matricula → Turma.professorId → context.usuario.id
```

Para resolver `Feedback.matricula`, não permita vazamento entre professores. Como o objeto `Feedback` já foi obtido por operação autorizada, o resolver relacional pode carregar a matrícula correspondente.

### Comportamento de consulta

- `feedback(id)` retorna `null` se ausente ou de outro professor;
- `feedbacks(matriculaId)` retorna erro `NOT_FOUND` se a matrícula não pertencer ao professor;
- filtros inválidos retornam `BAD_USER_INPUT`;
- padrão `status = ativo`;
- resultados devem ter ordem determinística.

### Comportamento de escrita

- feedback manual aceita turma/matrícula encerrada;
- `texto` deve ser string não vazia;
- `perfil`, `professorId`, estados e timestamps nunca vêm do cliente;
- edição de documento enviado retorna `CONFLICT`;
- arquivamento não altera envio nem apaga texto;
- restauração conflitante retorna `CONFLICT`;
- transições de envio devem manter coerência de `enviadoEm`.

### Verificações obrigatórias

- sintaxe de todos os arquivos;
- schema GraphQL inicializa sem conflito de tipos;
- cenários locais simulados para autenticação, propriedade, filtros, criação, edição, envio, arquivamento, restauração e duplicidade;
- confirmar que nenhum método de exclusão foi introduzido;
- `git diff --check`.

### Relatório de saída

Inclua:

- arquivos criados/alterados;
- operações implementadas;
- contagem e resultado dos testes;
- pendências que exigem MongoDB real;
- diff exclusivo do Checkpoint 1;
- frase final: `Parei no Checkpoint 1 e aguardo aprovação.`

## 5. Checkpoint 2 — Infraestrutura segura de IA

### Objetivo

Criar serviços isolados de prompt e integração OpenAI, ainda sem conectar mutations aos resolvers.

### Arquivos autorizados

- criar `src/services/promptService.js`;
- criar `src/services/iaService.js`.

Nenhum resolver, model, schema, README ou arquivo de ambiente pode ser alterado.

### `promptService.js`

Exportar funções puras e testáveis, por exemplo:

- `montarPromptMensagemDiaria(contexto)`;
- `montarPromptFeedback(contexto)`;
- constantes de limites;
- função de limpeza/truncamento textual.

O nome exato pode variar, mas a separação de responsabilidades é obrigatória.

As funções devem receber objetos já sanitizados ou sanitizar defensivamente. Não aceitar nem propagar `contatoResponsavel`, IDs, tokens ou email do professor.

O prompt de mensagem diária deve usar:

- aluno e gênero;
- responsável e gênero, quando disponíveis;
- data/tópicos da aula;
- observação e avaliações do registro;
- estilo fixo e instruções de não invenção.

O prompt de feedback deve usar:

- tipo parcial/final;
- aluno/responsável;
- turma/período;
- sequência cronológica de evidências;
- foco em evolução, forças e próximos passos;
- proibição de diagnóstico e comparação.

### `iaService.js`

Responsabilidades:

- validar `OPENAI_API_KEY` e `OPENAI_MODEL` apenas no momento da chamada;
- instanciar cliente OpenAI tardiamente;
- chamar o modelo usando uma API compatível com a versão instalada do SDK;
- parametrizar temperatura e limite de saída como constantes conservadoras;
- extrair e validar texto retornado;
- transformar falhas em `GraphQLError` controlado;
- não vazar erro bruto na resposta;
- não logar prompt completo ou segredo.

Pode exportar uma função genérica `gerarTexto({ system, user, ... })` ou funções específicas, desde que o resolver não conheça detalhes do SDK.

### Testes locais mínimos

Sem chamar a internet:

- configuração ausente retorna `IA_NOT_CONFIGURED`;
- builder diário não inclui `contatoResponsavel`;
- builder sem responsável continua válido;
- builder com gêneros e responsável usa somente campos permitidos;
- feedback ordena/limita evidências conforme contrato;
- textos muito longos são truncados de forma determinística;
- saída vazia simulada retorna `IA_UNAVAILABLE`;
- erro simulado do SDK retorna `IA_UNAVAILABLE` sem detalhes sensíveis.

### Relatório de saída

Apresente diff exclusivo e pare com:

`Parei no Checkpoint 2 e aguardo aprovação.`

## 6. Checkpoint 3 — Geração de mensagem diária

### Objetivo

Conectar o serviço de IA ao registro diário existente.

### Arquivos autorizados

- modificar `src/graphql/typeDefs/registroTypeDefs.js`;
- modificar `src/graphql/resolvers/registroResolvers.js`.

Os serviços podem ser apenas importados, não reescritos neste checkpoint, salvo correção mínima explicitamente justificada e aprovada.

### Mutation

Adicionar:

```graphql
gerarMensagemDiaria(id: ID!): RegistroDiario!
```

### Carregamento de dados

Adicionar import de `Aluno` e do serviço necessário. Reaproveitar helpers existentes de autenticação, propriedade e estrutura ativa.

Fluxo obrigatório:

1. autenticar e exigir professor;
2. validar ID;
3. carregar registro;
4. carregar aula e matrícula com propriedade;
5. confirmar turma idêntica;
6. exigir estrutura ativa;
7. carregar aluno pertencente ao professor e à matrícula;
8. montar um objeto explícito somente com campos permitidos;
9. chamar IA;
10. salvar original, editada e `geradaEm`;
11. retornar registro.

Não passe documentos Mongoose inteiros ao prompt. Construa DTO explícito.

### Regressões proibidas

- não alterar criação, atualização, arquivamento, restauração ou consulta de registros;
- não alterar índice;
- não alterar `editarMensagemDiaria`;
- não chamar IA durante outra mutation;
- não exigir tópicos de aula;
- não enviar contato do responsável.

### Testes locais mínimos

- sem autenticação;
- admin proibido;
- ID inválido;
- registro inexistente;
- registro de outro professor;
- inconsistência aula/matrícula;
- turma encerrada;
- matrícula encerrada;
- aula arquivada;
- registro arquivado;
- aluno inexistente/inacessível;
- geração com tópicos;
- geração sem tópicos;
- geração com observação apenas;
- geração com avaliações apenas;
- regeneração substitui campos esperados;
- falha controlada da IA não altera o documento;
- `contatoResponsavel` ausente no argumento do serviço.

### Relatório de saída

Apresente diff exclusivo e pare com:

`Parei no Checkpoint 3 e aguardo aprovação.`

## 7. Checkpoint 4 — Geração de feedback parcial/final

### Objetivo

Implementar geração individual ou em lote para matrículas selecionadas.

### Arquivos autorizados

- modificar `src/graphql/typeDefs/feedbackTypeDefs.js`;
- modificar `src/graphql/resolvers/feedbackResolvers.js`;
- modificar `src/graphql/schema.js` somente se necessário para formatação/integração já prevista.

### Contrato

Adicionar:

```graphql
input GerarFeedbacksInput {
  matriculaIds: [ID!]!
  tipo: String!
}

extend type Mutation {
  gerarFeedbacks(input: GerarFeedbacksInput!): [Feedback!]!
}
```

### Dados necessários

Carregar, para cada matrícula:

- matrícula;
- aluno;
- turma;
- aulas relacionadas;
- registros ativos do aluno naquele contexto;
- campos pedagógicos estritamente permitidos.

Não usar `contatoResponsavel`.

Registros arquivados ficam fora da síntese. Aulas arquivadas podem continuar relacionadas a um registro ativo histórico; não descarte uma evidência ativa apenas porque a aula foi arquivada depois. O critério de inclusão principal é o status do registro e a coerência da matrícula/turma.

### Atomicidade lógica do lote

Antes de qualquer chamada externa:

- validar lista não vazia;
- rejeitar IDs duplicados;
- validar todos os IDs;
- validar propriedade de todas as matrículas;
- validar tipo;
- validar existência de evidência para cada matrícula;
- verificar feedback enviado conflitante para cada matrícula.

Depois:

1. montar todos os prompts;
2. gerar todos os textos;
3. somente se todas as gerações forem bem-sucedidas, persistir os resultados;
4. retornar na ordem de entrada.

Para feedback ativo em rascunho, atualizar:

- `textoIAOriginal`;
- `textoEditado`;
- `geradoPorIA = true`;
- `geradoEm`;
- manter `statusEnvio = rascunho`.

Para novo feedback, criar com esses mesmos valores. Feedback enviado gera `CONFLICT` antes da IA.

### Concorrência

Preservar o índice parcial. Tratar `11000`/`11001`. Uma pré-consulta não substitui o índice.

### Testes locais mínimos

- lista vazia;
- ID repetido;
- tipo inválido;
- mistura de matrícula própria e alheia;
- matrícula sem registros;
- geração parcial individual;
- geração final individual;
- lote com múltiplas matrículas;
- ordem de retorno igual à entrada;
- turma ativa;
- turma encerrada;
- matrícula encerrada;
- regeneração de rascunho;
- bloqueio de enviado;
- falha em uma geração não persiste novos feedbacks;
- nenhum contato de responsável é enviado;
- duplicidade concorrente é convertida em `CONFLICT`.

### Relatório de saída

Apresente diff exclusivo e pare com:

`Parei no Checkpoint 4 e aguardo aprovação.`

## 8. Checkpoint 5 — Coleção Postman e README

### Objetivo

Documentar e demonstrar o módulo implementado sem reabrir o escopo das fases anteriores.

### Arquivos autorizados

- modificar `DevClass Backend.postman_collection.json`;
- modificar `README.md`;
- modificar `.env.example` apenas se faltarem os nomes vazios `OPENAI_API_KEY=` ou `OPENAI_MODEL=`.

Não recriar `.postman/` ou `postman/`.

### Coleção Postman

Adicionar uma pasta final `09 — Feedback e IA`, preservando todas as requisições existentes.

Variáveis novas sugeridas:

- `feedbackParcialId`;
- `feedbackFinalId`;
- `feedbackSubstitutoId`.

Nunca preencher chave da OpenAI, token real ou IDs fixos no arquivo.

Cada requisição deve conter testes de:

- status HTTP;
- ausência de stacktrace;
- `extensions.code` em erros GraphQL;
- estrutura mínima da resposta;
- captura automática de IDs quando aplicável;
- ausência de senha/segredo;
- preservação de ordem e estados quando relevante.

Inclua o roteiro essencial definido no arquivo de testes desta documentação. Não transforme a coleção em centenas de variações redundantes; cubra cada regra com o menor conjunto que demonstre o contrato.

### README

Atualizar:

- descrição para fases 1 a 5;
- stack incluindo OpenAI sob demanda;
- variáveis de ambiente sem valores;
- diferença entre REST e GraphQL;
- modelo de feedback;
- operações novas;
- segurança e privacidade;
- ausência de envio automático;
- instrução curta para importar e executar a coleção;
- limitações reais;
- exclusões de escopo.

Remover a afirmação de que Feedback e IA não estão implementados apenas depois que os testes funcionais correspondentes passarem.

### Verificações

- `jq empty`;
- todas as URLs usam `{{baseUrl}}`;
- nenhuma variável sensível tem valor versionado;
- todos os scripts Postman têm sintaxe válida;
- nenhuma requisição antiga foi removida acidentalmente;
- README condiz com o código real;
- `git diff --check`.

### Relatório de saída

Apresente contagens antes/depois, diff exclusivo e pare com:

`Parei no Checkpoint 5 e aguardo aprovação.`

## 9. Checkpoint 6 — Validação integrada e preparação de entrega

### Objetivo

Verificar a aplicação completa sem ampliar funcionalidades.

### Alterações permitidas

Nenhuma alteração inicialmente. Se um teste falhar, diagnostique e solicite autorização com:

- causa;
- arquivo necessário;
- mudança mínima proposta;
- risco de regressão.

### Validação estática

```bash
find src -name '*.js' -print0 | xargs -0 -n1 node --check
jq empty "DevClass Backend.postman_collection.json"
git diff --check
git status --short
```

### Validação funcional essencial

Executar apenas o caminho crítico da matriz:

1. login do professor;
2. consultar dados de demonstração;
3. criar feedback manual;
4. editar;
5. marcar enviado;
6. comprovar bloqueio de edição;
7. desmarcar;
8. arquivar/restaurar;
9. gerar mensagem diária;
10. gerar feedback parcial em uma matrícula;
11. gerar feedback final em lote;
12. consultar pendentes/enviados;
13. provar isolamento com professor B;
14. provar `IA_NOT_CONFIGURED` em ambiente sem configuração, se houver ambiente separado seguro.

### Verificação de índice

Confirmar no MongoDB:

```javascript
Feedback.collection.indexes()
```

Deve existir índice único parcial em `{ matriculaId: 1, tipo: 1 }` com filtro `{ status: 'ativo' }`.

Se a criação do índice falhar por duplicidades antigas, pare, liste apenas combinações conflitantes sem dados pessoais e solicite decisão. Não corrija documentos automaticamente.

### Revisão de segurança

Buscar padrões perigosos sem exibir `.env`:

```bash
rg -n "contatoResponsavel|OPENAI_API_KEY|console\.log|deleteOne|deleteMany|findByIdAndDelete" src README.md "DevClass Backend.postman_collection.json"
```

Interpretar resultados; a presença do nome `OPENAI_API_KEY` como variável é legítima. O objetivo é encontrar exposição de valor, envio indevido, log ou exclusão.

### Entrega do checkpoint

Produzir um relatório final com:

- funcionalidades aprovadas;
- testes executados e resultados;
- testes não executados;
- limitações;
- `git status --short`;
- lista consolidada de arquivos alterados;
- recomendação clara: pronto ou não pronto para commit.

Parar antes do commit.

## 10. Checkpoint 7 — Git, somente com autorização

Após aprovação explícita:

1. revisar o diff completo;
2. confirmar que a branch ainda é `correcao-integracao-thayslan`;
3. criar commit descritivo;
4. fazer push da mesma branch;
5. fornecer orientação para Pull Request;
6. não fazer merge automaticamente.

Mensagem sugerida:

```text
feat: implementa feedbacks pedagógicos e geração com IA
```

## 11. Regras de parada imediata

Pare e peça decisão se ocorrer qualquer um destes casos:

- branch diferente da esperada;
- worktree com alteração conflitante de origem desconhecida;
- necessidade de ler ou modificar `.env`;
- necessidade de instalar/atualizar dependência;
- migração que exija alterar dados existentes;
- índice impedido por duplicidades reais;
- contrato atual incompatível com a especificação;
- teste revelar possível vazamento entre professores;
- contato do responsável alcançar o serviço de IA;
- operação exigir exclusão física;
- execução demandar chave não disponível;
- necessidade de commit, push ou merge.

## 12. Formato obrigatório de cada resposta do agente

Use uma resposta técnica curta, sem tutorial conversacional:

````text
Checkpoint N concluído/não concluído.

Arquivos:
- ...

Implementado:
- ...

Verificações:
- comando: resultado

Pendências/riscos:
- ...

Diff exclusivo:
```diff
...
```

Parei no Checkpoint N e aguardo aprovação.
````

Não avance porque os testes locais passaram. A aprovação humana entre checkpoints é parte do processo.
