# DevClass — Matriz de testes e roteiro de apresentação: Feedback e IA

## 1. Objetivo

Este documento define a validação mínima e a demonstração acadêmica do módulo de Feedback e IA. Ele não substitui a coleção Postman; especifica o que ela deve comprovar.

Prioridades:

- `P0`: obrigatório antes da entrega;
- `P1`: importante, executar se houver tempo;
- `P2`: aprofundamento técnico, pode ser explicado como limitação de teste.

## 2. Pré-condições

- API conectada ao MongoDB de desenvolvimento;
- professor A autenticado;
- professor B autenticado para isolamento;
- turma principal com uma matrícula e um registro ativo;
- idealmente uma segunda matrícula com registro ativo para geração em lote;
- pelo menos uma aula com tópicos;
- `OPENAI_API_KEY` e `OPENAI_MODEL` configurados localmente para testes de geração;
- collection oficial importada;
- `baseUrl` configurada;
- tokens e IDs capturados por scripts, não gravados no arquivo versionado.

Não mostrar `.env`, JWT completo, connection string ou chave durante a apresentação.

## 3. Matriz de testes do domínio Feedback

| ID | Pri. | Cenário | Operação | Resultado esperado |
| --- | --- | --- | --- | --- |
| F01 | P0 | Sem token | `criarFeedbackManual` | `UNAUTHENTICATED`, sem stacktrace |
| F02 | P0 | Admin no domínio pedagógico | `feedbacks` | `FORBIDDEN` |
| F03 | P0 | Criar parcial manual | `criarFeedbackManual` | feedback `ativo`, `rascunho`, `geradoPorIA=false` |
| F04 | P0 | Criar final manual | `criarFeedbackManual` | coexistência com parcial da mesma matrícula |
| F05 | P0 | Duplicar parcial ativo | `criarFeedbackManual` | `CONFLICT` |
| F06 | P0 | Texto vazio | `criarFeedbackManual` | `BAD_USER_INPUT` |
| F07 | P0 | Tipo inválido | `criarFeedbackManual` | `BAD_USER_INPUT` |
| F08 | P0 | Consultar ativos | `feedbacks` | lista contém parcial/final ativos |
| F09 | P1 | Filtrar tipo | `feedbacks(tipo: parcial)` | somente parciais |
| F10 | P1 | Filtrar envio | `feedbacks(statusEnvio: rascunho)` | somente rascunhos |
| F11 | P0 | Editar rascunho | `editarFeedback` | altera só `textoEditado` |
| F12 | P0 | Marcar enviado | `marcarFeedbackEnviado` | `statusEnvio=enviado`, `enviadoEm` ISO |
| F13 | P0 | Editar enviado | `editarFeedback` | `CONFLICT` |
| F14 | P0 | Desmarcar envio | `desmarcarFeedbackEnviado` | `rascunho`, `enviadoEm=null` |
| F15 | P0 | Editar após desmarcar | `editarFeedback` | sucesso |
| F16 | P0 | Arquivar | `arquivarFeedback` | `status=arquivado`, conteúdo preservado |
| F17 | P0 | Histórico | `feedbacks(status: todos)` | ativo e arquivado aparecem |
| F18 | P0 | Criar substituto após arquivar | `criarFeedbackManual` | sucesso |
| F19 | P0 | Restaurar original com substituto | `restaurarFeedback` | `CONFLICT` |
| F20 | P0 | Arquivar substituto/restaurar original | duas mutations | restauração com conteúdo preservado |
| F21 | P0 | Outro professor consulta por ID | `feedback` | `null` |
| F22 | P0 | Outro professor altera | qualquer mutation | `NOT_FOUND` |
| F23 | P1 | ID inválido | mutation/query | `BAD_USER_INPUT` |
| F24 | P1 | Filtro inválido | `feedbacks` | `BAD_USER_INPUT` |
| F25 | P1 | Turma encerrada | criar/editar feedback manual | sucesso histórico |
| F26 | P1 | Matrícula encerrada | marcar enviado | sucesso histórico |

## 4. Matriz de testes da mensagem diária com IA

| ID | Pri. | Cenário | Resultado esperado |
| --- | --- | --- | --- |
| D01 | P0 | Gerar a partir de registro ativo completo | original/editada iguais e `geradaEm` ISO |
| D02 | P0 | Editar mensagem gerada | somente `mensagemEditada` muda |
| D03 | P1 | Gerar sem tópicos da aula | sucesso baseado nas observações |
| D04 | P1 | Gerar com observação apenas | sucesso |
| D05 | P1 | Gerar com avaliações apenas | sucesso |
| D06 | P0 | Registro de outro professor | `NOT_FOUND` |
| D07 | P0 | Turma encerrada | `BAD_USER_INPUT` |
| D08 | P0 | Matrícula encerrada | `BAD_USER_INPUT` |
| D09 | P0 | Aula arquivada | `BAD_USER_INPUT` |
| D10 | P0 | Registro arquivado | `BAD_USER_INPUT` |
| D11 | P0 | IA sem configuração | `IA_NOT_CONFIGURED`, servidor continua funcional |
| D12 | P1 | Provedor indisponível simulado/local | `IA_UNAVAILABLE`, documento não alterado |
| D13 | P0 | Regenerar | substitui original/editada e atualiza `geradaEm` |
| D14 | P0 | Privacidade | serviço não recebe `contatoResponsavel` |

## 5. Matriz de testes de geração de feedback com IA

| ID | Pri. | Cenário | Resultado esperado |
| --- | --- | --- | --- |
| G01 | P0 | Gerar parcial para uma matrícula | rascunho ativo, `geradoPorIA=true` |
| G02 | P0 | Gerar final para uma matrícula | final coexistindo com parcial |
| G03 | P0 | Selecionar duas matrículas | dois feedbacks, ordem igual à entrada |
| G04 | P0 | Lista vazia | `BAD_USER_INPUT`, IA não chamada |
| G05 | P1 | ID duplicado na lista | `BAD_USER_INPUT`, IA não chamada |
| G06 | P0 | Uma matrícula de outro professor no lote | `NOT_FOUND`, nenhuma IA chamada/persistência |
| G07 | P0 | Matrícula sem registros ativos | `BAD_USER_INPUT` |
| G08 | P0 | Regenerar feedback em rascunho | textos e `geradoEm` substituídos |
| G09 | P0 | Regenerar feedback enviado | `CONFLICT`, IA não chamada |
| G10 | P0 | Gerar após desmarcar envio | sucesso |
| G11 | P0 | Turma encerrada | sucesso, pois é consolidação histórica |
| G12 | P0 | Matrícula encerrada | sucesso histórico |
| G13 | P1 | Registros arquivados | evidências arquivadas não entram no prompt |
| G14 | P1 | Mais de 40 registros | recorte determinístico conforme constante |
| G15 | P0 | Falha em um item antes da IA | lote não persiste nenhum item novo |
| G16 | P1 | Falha do provedor durante geração | erro controlado e nenhuma persistência nova |
| G17 | P0 | Contato do responsável existente | contato não aparece no DTO/prompt |
| G18 | P0 | Resposta sem fatos inventados | revisão humana confirma aderência às evidências |

## 6. Matriz de regressão das fases 1 a 4

Antes da entrega, executar ao menos:

| ID | Pri. | Cenário | Resultado esperado |
| --- | --- | --- | --- |
| R01 | P0 | Cadastro REST válido | `201` |
| R02 | P0 | Login REST válido | `200` e token |
| R03 | P0 | Login inválido | `401` genérico |
| R04 | P0 | Criar/listar turma | sucesso e isolamento |
| R05 | P0 | Criar aluno e matrícula | sucesso |
| R06 | P0 | Criar aula com data válida | sucesso |
| R07 | P0 | Data inexistente | `BAD_USER_INPUT` |
| R08 | P0 | Aula duplicada ativa | `CONFLICT` |
| R09 | P0 | Criar registro múltiplas habilidades | sucesso |
| R10 | P0 | Registro duplicado ativo | `CONFLICT` |
| R11 | P0 | Consultar histórico | arquivados preservados |
| R12 | P0 | Outro professor | ausência de vazamento |

## 7. Caminho rápido para entrega amanhã

Se o tempo for limitado, execute nesta ordem:

1. validação estática completa;
2. F03, F05, F11, F12, F13, F14, F16, F20;
3. D01, D02, D11, D14;
4. G01, G03, G07, G09, G11, G17;
5. R02, R04, R05, R06, R09, R12;
6. validar coleção e README;
7. revisar diff e estado do Git.

Esse subconjunto demonstra CRUD, autenticação, GraphQL, MongoDB, arquivamento, integridade, IA sob demanda, edição humana e privacidade.

## 8. Roteiro de apresentação de 8 a 10 minutos

### 8.1 Contexto — 45 segundos

Apresentar o problema:

- professor registra evolução sem ser obrigado a escrever algo em toda aula;
- diferentes habilidades podem ter desempenhos diferentes;
- feedback parcial/final consolida evidências do semestre;
- IA auxilia a redação, mas o professor revisa e confirma o envio.

### 8.2 Arquitetura — 60 segundos

Mostrar:

- REST para cadastro/login/admin;
- GraphQL para o domínio pedagógico;
- MongoDB/Mongoose para persistência;
- JWT no contexto;
- OpenAI isolada em serviço sob demanda.

### 8.3 Dados existentes — 60 segundos

No Postman:

- login;
- listar turma/alunos;
- listar aula e registro com múltiplas habilidades.

### 8.4 CRUD de feedback — 2 minutos

Demonstrar:

1. criar feedback manual parcial;
2. consultar;
3. editar;
4. marcar enviado;
5. mostrar bloqueio de edição;
6. desmarcar;
7. arquivar e consultar histórico.

Isso comprova o CRUD mesmo se a API externa estiver indisponível.

### 8.5 IA — 2 minutos

Demonstrar:

1. gerar mensagem diária;
2. mostrar original e versão editável;
3. gerar feedback parcial ou final para alunos selecionados;
4. explicar que só registros ativos entram na síntese;
5. destacar que o contato do responsável nunca é enviado.

### 8.6 Segurança e integridade — 90 segundos

Executar duas respostas curtas:

- outro professor tentando acessar recurso → `NOT_FOUND`/`null`;
- duplicidade ativa → `CONFLICT`.

Explicar:

- identidade vem do JWT;
- índices únicos parciais protegem concorrência;
- nada é apagado fisicamente;
- stacktraces e segredos não aparecem.

### 8.7 Encerramento — 30 segundos

Resumir:

- histórico semestral preservado;
- professor no controle da geração, edição e envio;
- backend demonstrável no Postman;
- frontend e envio automático permanecem fora do escopo.

## 9. Plano de contingência para a apresentação

### OpenAI indisponível ou sem créditos

- demonstrar `IA_NOT_CONFIGURED` ou `IA_UNAVAILABLE` como tratamento correto;
- usar `criarFeedbackManual` para completar o CRUD;
- mostrar no código que o cliente é tardio e não derruba a API;
- usar uma resposta previamente gerada apenas como exemplo visual, deixando claro que não foi gerada ao vivo.

### MongoDB Atlas rejeita conexão

- verificar IP Access List sem mostrar credenciais;
- manter capturas das respostas principais;
- não trocar a URI durante a apresentação.

### Token expirado ou Postman reiniciado

- executar login novamente;
- deixar script de captura preencher a variável de token;
- não colar token manualmente em arquivos versionados.

### Dados de demonstração já existem

- usar emails/nomes exclusivos por execução ou limpar apenas o banco de desenvolvimento com autorização prévia;
- preferir arquivar e criar substitutos quando o objetivo for demonstrar histórico;
- nunca executar remoção em massa automaticamente.

## 10. Evidências de conclusão

Antes do commit, guardar no relatório da equipe:

- resultado de `node --check`;
- resultado de `git diff --check`;
- resultado de `jq empty`;
- lista das operações Postman P0 aprovadas;
- confirmação do índice de `Feedback`;
- confirmação de ausência de contato no prompt;
- confirmação de ausência de segredos no diff;
- limitações ou testes não executados;
- nome da branch e hash do commit somente depois da aprovação.

## 11. Critério de apresentação aceitável mesmo com pendências

O projeto pode ser apresentado como versão parcial se, no mínimo:

- autenticação, turmas, alunos, matrículas, aulas e registros continuarem funcionando;
- CRUD manual de feedback estiver funcional;
- a arquitetura de IA estiver isolada e falhar de forma controlada;
- o grupo declarar com transparência quais cenários de IA não foram testados ao vivo;
- README não afirmar que algo inexistente está pronto;
- não houver segredo versionado ou vazamento entre professores.

Não apresentar como concluída uma geração que só exista em mock. Diferencie claramente:

- implementado e testado;
- implementado, mas não testado com provedor real;
- planejado e fora desta entrega.
