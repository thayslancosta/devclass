# DevClass — Backend do diário de evolução pedagógica

Backend das fases 1 a 5: autenticação, administração, turmas, alunos, matrículas, aulas, registros diários e feedback parcial/final. A geração de mensagens e feedbacks com IA é sob demanda, com revisão humana. A integração foi testada localmente com modelos e provedor simulados; chamadas reais à OpenAI e execução HTTP no Postman permanecem pendentes.

## Stack

- Node.js (CommonJS) + Express 5
- MongoDB Atlas + Mongoose
- Autenticação JWT (Bearer Token)
- Apollo Server 5 (GraphQL) para o domínio pedagógico
- Senhas protegidas com bcryptjs
- SDK OpenAI isolado em serviço com carregamento tardio e API Responses

## Como rodar o projeto

### 1. Pré-requisitos
- Node.js instalado
- Um cluster MongoDB Atlas (free tier já é suficiente) com um usuário de banco criado e o IP liberado em Network Access

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Configure localmente as variáveis de ambiente necessárias ao servidor:

- `MONGODB_URI`: conexão do ambiente de desenvolvimento.
- `PORT`: porta HTTP da API.
- `JWT_SECRET`: segredo de assinatura dos tokens.

- `OPENAI_API_KEY`: credencial do provedor, necessária somente para geração.
- `OPENAI_MODEL`: modelo com suporte aos parâmetros da API Responses utilizados pelo serviço, incluindo `temperature`.

Os nomes estão em `.env.example`, com as variáveis OpenAI vazias. Não coloque valores reais no README ou na coleção. Sem chave ou modelo, o servidor e as operações manuais continuam disponíveis; solicitar geração retorna `IA_NOT_CONFIGURED`. A configuração OpenAI fica somente no servidor, nunca no Postman.

**Nunca** commite o `.env` — ele já está no `.gitignore`.

### 4. Rodar o servidor
```bash
npm start
```
Após iniciar, use `{{baseUrl}}/auth/register`, `{{baseUrl}}/auth/login` e `{{baseUrl}}/graphql` no Postman. `baseUrl` é uma variável da coleção preenchida com o endereço da sua API, sem barra final.

O servidor **não sobe** se o MongoDB falhar ao conectar (comportamento intencional, exigido pela especificação).

### 5. Administração opcional

O cadastro público sempre cria `professor`; não existe endpoint público que crie ou promova admin. O roteiro principal funciona desde banco vazio com dois professores criados pela própria coleção. Os testes administrativos exigem uma conta admin provisionada externamente, fora do roteiro, e ficam desativados por padrão. A coleção não promove usuários nem executa comandos diretos no banco.

## Fase 1 — Base, autenticação e segurança

Implementado por Walter Luan — base, autenticação e segurança.

### Rotas REST
| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/register` | Público | Cadastra professor (perfil sempre `professor`) |
| POST | `/auth/login` | Público | Autentica e retorna JWT |
| GET | `/admin/usuarios` | Admin | Lista usuários (aceita filtros `?perfil=` e `?ativo=`) |
| PATCH | `/admin/usuarios/:id/status` | Admin | Ativa/inativa um usuário (`{ "ativo": boolean }`) |

### GraphQL
- Endpoint único: `POST /graphql`
- Query `health` autenticada, disponível para teste de contexto.
- `context.usuario` é populado a partir do Bearer Token e disponível para todos os resolvers futuros — nunca confiar em `professorId`/`usuarioId` vindo do cliente.

### Regras de segurança já implementadas
- Senha nunca é devolvida em nenhuma resposta (hash com bcrypt, campo com `select: false`).
- Login usa mensagem genérica (`"Email ou senha inválidos."`) tanto para email inexistente quanto senha errada quanto usuário inativo — não revela qual foi o motivo.
- `autenticar` (middleware REST) e o `contexto` (GraphQL) sempre confirmam no banco que o usuário **ainda está ativo**, mesmo que o JWT em si continue válido.
- `autorizar('admin')` bloqueia com 403 qualquer perfil fora da lista permitida.
- Nenhuma exclusão física: usuários são inativados (`ativo: false`), nunca deletados.

### Validações REST e cobertura da coleção

- Cadastro exige nome textual não vazio após `trim`, email textual normalizado com `trim().toLowerCase()` e formato válido, e senha textual com ao menos seis caracteres.
- Login exige email e senha textuais não vazios; tipos incorretos retornam `400`, sem chamar bcrypt com entradas incompatíveis.
- Email duplicado retorna `409`; email inexistente, senha incorreta e usuário inativo retornam a mesma mensagem genérica com `401`.
- A coleção verifica cadastro, login, tipos incorretos, autenticação e autorização. A pasta administrativa opcional também cobre inativação e reativação de usuário.
- O schema já integra os módulos pedagógicos; o professor vem do contexto autenticado, nunca do input.

A execução real desta versão da coleção no Postman permanece pendente; os testes locais usam modelos simulados.

---

# Fase 2 — Turmas e períodos letivos

**Responsável:** João Vitor Vicente
**Arquivos:** `src/models/Turma.js`, `src/graphql/typeDefs/turmaTypeDefs.js`, `src/graphql/resolvers/turmaResolvers.js`

## Operações

| Tipo | Operação | Observação |
| --- | --- | --- |
| Query | `periodosDisponiveis` | períodos únicos do professor, do mais recente ao mais antigo |
| Query | `minhasTurmas(periodoLetivo, status)` | sem `status`, retorna só as `ativa`. Aceita `ativa`, `encerrada` ou `todas` |
| Query | `turma(id)` | só turma do professor autenticado |
| Mutation | `criarTurma(input)` | `professorId` vem do JWT |
| Mutation | `atualizarTurma(id, input)` | altera nome, estágio e encontros; não muda período nem proprietário |
| Mutation | `encerrarTurma(id)` | `status = encerrada`, sem apagar |
| Mutation | `reativarTurma(id)` | `status = ativa` |

## Validações

* `periodoLetivo`: `AAAA.1` ou `AAAA.2`.
* `encontros`: **pelo menos um**, cada um com `diaSemana` e `horario`.
* `diaSemana`: `segunda`, `terca`, `quarta`, `quinta`, `sexta`, `sabado`, `domingo` (minúsculas, seção 8 da especificação).
* `horario`: `HH:mm` entre `00:00` e `23:59`.

## Correções aplicadas na integração da Fase 3

Ao integrar a Fase 3 foram encontrados e corrigidos quatro problemas na Fase 2:

1. **A Fase 2 não estava integrada ao schema.** O `src/graphql/schema.js` continuava na versão da Fase 1, com apenas `type Query { health }`. Os arquivos de Turma existiam, mas nada os importava — nenhuma operação de turma existia em tempo de execução. Corrigido no `schema.js`.
2. **`encontros` aceitava lista vazia**, contrariando a seção 7.2 ("obrigatório, um ou mais objetos"). Agora é exigido pelo menos um encontro, tanto no Model quanto no resolver.
3. **`minhasTurmas(status)` não validava o valor recebido**: um status inválido devolvia lista vazia em silêncio. Agora devolve erro claro.
4. **Erros não usavam `extensions.code`** da seção 11.8 — tudo virava `INTERNAL_SERVER_ERROR`. Agora usam `UNAUTHENTICATED`, `BAD_USER_INPUT` e `NOT_FOUND`, igual à Fase 3.

`encerrarTurma` e `reativarTurma` salvam com `validateModifiedOnly: true`, porque só alteram `status`. Sem isso, turmas criadas antes da regra do item 2 não poderiam mais ser encerradas.

---

# Fase 3 — Alunos, responsáveis e matrículas

**Responsável:** Ramon Trindade
**Arquivos:** `src/models/Aluno.js`, `src/models/Matricula.js`, `src/graphql/typeDefs/alunoTypeDefs.js`, `src/graphql/typeDefs/matriculaTypeDefs.js`, `src/graphql/resolvers/alunoResolvers.js`, `src/graphql/resolvers/matriculaResolvers.js`

## Models

### Aluno

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `nome` | String | sim | trim; não pode ser vazio |
| `generoGramatical` | Enum | sim | `masculino` \| `feminino` \| `neutro` |
| `nomeResponsavel` | String | não | trim |
| `generoResponsavel` | Enum | condicional | `masculino` \| `feminino` \| `neutro` |
| `contatoResponsavel` | String | não | dado humano; **nunca enviado à IA** |
| `professorId` | ObjectId | sim | referência a `Usuario`; sempre do JWT |
| `status` | Enum | sim | `ativo` \| `inativo`; padrão `ativo` |

### Matricula

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `alunoId` | ObjectId | sim | `Aluno` do mesmo professor |
| `turmaId` | ObjectId | sim | `Turma` do mesmo professor |
| `periodoLetivo` | String | sim | **copiado da turma** |
| `status` | Enum | sim | `ativa` \| `encerrada`; padrão `ativa` |

Índice único composto: `matriculaSchema.index({ alunoId: 1, periodoLetivo: 1 }, { unique: true })`.

Ambos usam `timestamps: true`.

## Operações

| Tipo | Operação |
| --- | --- |
| Query | `aluno(id)` — inclui `matriculas` quando solicitado |
| Query | `alunosDaTurma(turmaId, status)` — padrão `ativa`; aceita `ativa`, `encerrada`, `todas` |
| Mutation | `criarAluno(input)` |
| Mutation | `atualizarAluno(id, input)` |
| Mutation | `inativarAluno(id)` / `reativarAluno(id)` |
| Mutation | `matricularAluno(alunoId, turmaId)` |
| Mutation | `encerrarMatricula(id)` |

Nenhum input aceita `professorId`, `status` ou `periodoLetivo`.

## Exemplos

```graphql
mutation {
  criarAluno(input: { nome: "Ana Souza", generoGramatical: "feminino" }) {
    id
    status
  }
}
```

```graphql
mutation {
  matricularAluno(alunoId: "ID_DO_ALUNO", turmaId: "ID_DA_TURMA") {
    id
    periodoLetivo
    status
  }
}
```

```graphql
query {
  aluno(id: "ID_DO_ALUNO") {
    nome
    status
    matriculas {
      id
      periodoLetivo
      status
      turma { nome }
    }
  }
}
```

## Regra do responsável

O aluno pode existir sem responsável. Se `generoResponsavel` ou `contatoResponsavel` forem informados, `nomeResponsavel` passa a ser obrigatório. A regra é validada no resolver e novamente no `pre('validate')` do Model. Em `atualizarAluno`, a validação roda sobre o **estado final** do documento — não dá para deixar o aluno incoerente limpando só o nome.

## Regras de matrícula e rematrícula

* O `periodoLetivo` é sempre copiado da turma.
* Um aluno só pode ter **uma matrícula por período letivo**. Conflito devolve erro claro com código `CONFLICT`, sem expor o `E11000` do MongoDB.
* **Rematrícula:** o mesmo aluno pode ser matriculado em turma de outro semestre; o histórico é preservado.
* Não é possível matricular aluno `inativo` nem em turma `encerrada`.
* Encerrar matrícula muda o `status` e **não** apaga o documento. Como o índice único considera `alunoId + periodoLetivo` independente do status, encerrar não libera o aluno para outra turma no mesmo semestre — é intencional.

## Segurança

* Todas as operações exigem `context.usuario`.
* `professorId` vem exclusivamente de `context.usuario.id`.
* Operações que buscam recursos para alterações ou listagens protegidas devolvem `NOT_FOUND` quando não pertencem ao professor. As consultas diretas `aluno(id)` e `turma(id)` retornam `null` sem erro para recurso ausente ou de outro professor; a coleção testa esse comportamento atual.
* Nenhuma exclusão física: sem `delete`, `findByIdAndDelete`, `deleteOne` ou `deleteMany`.

## Códigos de erro (seção 11.8)

| Código | Quando |
| --- | --- |
| `UNAUTHENTICATED` | sem token válido |
| `BAD_USER_INPUT` | enum, ID ou responsável incoerente |
| `NOT_FOUND` | recurso inexistente ou de outro professor |
| `CONFLICT` | matrícula duplicada no mesmo período, aula ativa duplicada por turma/data ou registro ativo duplicado por aula/matrícula |

## Testes

A pasta `03 - Alunos e matrículas` cria os dois alunos, testa a coerência do responsável, matrícula duplicada e rematrícula em outro semestre, além de consultar e preservar o histórico. Os IDs são preenchidos automaticamente; as turmas necessárias são criadas antes, na pasta 02.

## Fase 4 — Aulas e registros diários

**Responsável original:** Pedro Henrique Rodrigues
**Revisão de integração:** correções realizadas após a auditoria das fases 1–4.

### Operações GraphQL

| Tipo | Operação | Comportamento |
|---|---|---|
| Query | `aulas(turmaId, dataInicio, dataFim, status)` | Lista aulas próprias; padrão `ativa`; aceita `ativa`, `arquivada` ou `todas` |
| Query | `registros(matriculaId, dataInicio, dataFim, status)` | Lista registros próprios; padrão `ativo`; aceita `ativo`, `arquivado` ou `todos` |
| Mutation | `criarAula(input)` | Cria aula com data pertencente ao semestre da turma |
| Mutation | `atualizarAula(id, input)` | Altera data e tópicos sem trocar a turma |
| Mutation | `arquivarAula(id)` / `restaurarAula(id)` | Faz exclusão lógica e restauração |
| Mutation | `adicionarRegistro(input)` | Exige aula e matrícula da mesma turma |
| Mutation | `atualizarRegistro(id, input)` | Altera observação e avaliações |
| Mutation | `arquivarRegistro(id)` / `restaurarRegistro(id)` | Faz exclusão lógica e restauração |
| Mutation | `editarMensagemDiaria(id, texto)` | Edita manualmente o texto; não gera conteúdo por IA |

### Validações relevantes

- Todas as operações pedagógicas aceitam somente o perfil `professor`.
- IDs, datas, intervalos e filtros de status possuem validações nos resolvers.
- A data da aula e os filtros de data exigem `AAAA-MM-DD`, uma data real do calendário e o período da turma/matrícula. Timestamps e datas como `2026-09-31` são recusados com `BAD_USER_INPUT`; os valores são construídos em UTC.
- `Aula.data` é devolvida em `AAAA-MM-DD`; timestamps são devolvidos em ISO.
- Tópicos vazios e duplicados são removidos.
- Um registro precisa ter observação geral, avaliações ou ambos.
- A habilidade `outra` exige `outraDescricao`.
- Criar/restaurar aula exige turma ativa; atualizar aula ativa também exige turma ativa.
- Criar/restaurar registro exige turma, aula e matrícula ativas. Atualizar um registro ativo, inclusive sua mensagem diária, exige a mesma estrutura ativa.
- Aula e matrícula precisam pertencer à mesma turma e ao professor autenticado.
- Índices únicos parciais permitem no máximo uma aula ativa por turma/data e um registro ativo por aula/matrícula. Criação e restauração verificam conflitos; erros de índice `11000`/`11001` são convertidos em `CONFLICT`.
- Arquivamentos permanecem permitidos com estruturas encerradas. Não há cascade automático de status; consultas históricas e edição de documentos arquivados são preservadas.
- Consultas padrão ocultam aulas e registros arquivados.

### Postman

As pastas 04–07 demonstram aulas e registros, datas inexistentes, duplicidades ativas, restauração, estados encerrados/arquivados e isolamento. IDs originais e substitutos têm variáveis separadas para verificar a preservação do histórico.

## Correções de integração aplicadas

- O perfil `admin` foi bloqueado no domínio pedagógico, conforme a matriz de permissões.
- A Query `health` passou a exigir autenticação.
- Filtros administrativos e IDs inválidos agora retornam erro 400 controlado.
- `AtualizarTurmaInput` não solicita mais `periodoLetivo`, que é imutável.
- `encontros` é obrigatório no contrato GraphQL de criação de turma.
- A visão padrão de `alunosDaTurma` não mostra alunos inativos.
- Apollo Server foi atualizado para a versão 5.
- A coleção usa `{{baseUrl}}` em todas as requisições, cria os dados de demonstração na ordem de uso e salva tokens e IDs automaticamente.

## Observação sobre matrícula no mesmo semestre

O índice único continua sendo `{ alunoId, periodoLetivo }`, sem filtro de status. Portanto, encerrar uma matrícula não permite mover o aluno para outra turma no mesmo semestre. Essa é a regra congelada da especificação atual; alterá-la exige uma decisão formal do grupo.

## Executar a apresentação no Postman

1. Importe `DevClass Backend.postman_collection.json` e selecione as variáveis da **coleção**. Evite variáveis de ambiente/globais com os mesmos nomes, pois podem sobrepor os valores gerados.
2. Preencha localmente `baseUrl` (endereço HTTP(S), sem barra final), `senhaProfessor`, `senhaProfessorB` (mínimo de seis caracteres) e `senhaIncorreta` (não vazia e diferente das duas senhas). Use apenas valores de demonstração.
3. Execute as pastas 01–07 no Collection Runner, desde a requisição 001, em ordem sequencial. A primeira requisição limpa IDs/tokens anteriores e gera emails novos em `example.com`. Nenhum ID nem token precisa ser copiado manualmente. Os períodos de demonstração são `2026.2` e `2027.1`; mantenha `dataAula` no valor fornecido.
4. Confira os testes a cada resposta. Sucessos GraphQL exigem ausência de `errors`; erros verificam `extensions.code`. Todas as respostas são verificadas quanto à ausência de senha, hash e stacktrace. Variáveis ausentes interrompem o roteiro antes do envio.
5. A pasta 08 é opcional e usa `pm.execution.skipRequest()` quando `executarAdmin` está como `false`. Para executá-la depois do roteiro principal, preencha `emailAdmin` e `senhaAdmin` de uma conta admin de teste já provisionada e defina `executarAdmin` como `true`. Ela inativa e reativa somente o professor B criado pela demonstração. Sem admin, esses oito testes ficam **não executados**, não aprovados.
6. Execute a pasta `09 — Feedback e IA` após 01–07 (08 continua opcional). Ela prepara uma nova turma em `2027.2`, matricula os dois alunos existentes e cria evidências próprias. O CRUD manual e as validações funcionam sem OpenAI. `executarIA=false` pula as gerações; para testá-las conscientemente com o provedor configurado, use `true` (pode consumir créditos). `testarIASemConfiguracao=true` é exclusivo para ambiente separado sem configuração OpenAI, com `executarIA=false`. Testes pulados não contam como aprovados.
7. Antes de exportar para compartilhar/versionar, esvazie senhas, tokens, emails e todos os IDs nas variáveis exportadas; deixe também `baseUrl` vazio e `executarAdmin=false`, `executarIA=false`, `testarIASemConfiguracao=false`. Não inclua respostas salvas com tokens. O arquivo entregue contém esses valores vazios.

A coleção parte de banco vazio sem preparação de dados pedagógicos. Cada execução gera novos professores e preserva os documentos anteriores; ela não limpa o banco e não faz exclusão física. Para repetir, comece novamente pela requisição 001. Os testes de concorrência dos índices e a execução HTTP real dependem do ambiente de demonstração e não são comprovados por simulação local.

### Variáveis da coleção

| Variáveis | Preenchimento |
| --- | --- |
| `baseUrl` | Manual, endereço da API; exportado vazio |
| `senhaProfessor`, `senhaProfessorB`, `senhaIncorreta` | Manuais, exclusivamente de demonstração; exportadas vazias |
| `emailProfessor`, `emailProfessorB` | Geradas na primeira requisição |
| `professorToken`, `professorTokenB` | Salvos pelos logins |
| `usuarioId`, `usuarioIdB` | Salvos pelos cadastros |
| `turmaId`, `turmaIdMesmoPeriodo`, `turmaIdOutroSemestre`, `turmaIdProfessorB` | Salvos pela preparação das turmas |
| `alunoId`, `alunoId2` | Salvos pela criação dos alunos |
| `matriculaId`, `matriculaId2`, `matriculaIdOutroSemestre` | Salvos pelas matrículas |
| `aulaId`, `aulaIdSubstituta` | Salvos pela criação das aulas |
| `registroId`, `registroId2`, `registroIdSubstituto` | Salvos pela criação dos registros |
| `dataAula` | Data de demonstração no período `2026.2` |
| `executarAdmin` | `false` por padrão; ativa somente a pasta opcional quando `true` |
| `emailAdmin`, `senhaAdmin` | Manuais, somente para os testes opcionais; exportadas vazias |
| `adminToken` | Salvo pelo login administrativo opcional |

### Ordem completa das requisições

**01 - Autenticação e validações REST**

1. Cadastrar professor A e iniciar demonstração
2. Cadastro duplicado
3. Cadastro inválido: nome numérico
4. Cadastro inválido: email objeto
5. Cadastro inválido: senha lista
6. Login professor A
7. Login com senha incorreta
8. Login inválido: tipo de email
9. Login inválido: tipo de senha
10. Cadastrar professor B
11. Login professor B
12. Health autenticado
13. Health sem autenticação
14. Admin sem token
15. Professor sem permissão administrativa

**02 - Preparação das turmas**

16. Criar turma principal
17. Criar outra turma do mesmo período
18. Criar turma de outro semestre
19. Criar turma do professor B
20. Listar períodos
21. Listar turmas ativas
22. Filtrar turmas por período
23. Consultar turma principal
24. Atualizar turma
25. Erro: período inválido
26. Erro: horário inválido
27. Erro: dia inválido
28. Erro: lista de encontros vazia

**03 - Alunos e matrículas**

29. Criar aluno sem responsável
30. Criar aluno com responsável
31. Erro: contato sem responsável
32. Erro: gênero inválido
33. Erro: limpar nome do responsável mantendo contato
34. Atualizar aluno
35. Matricular primeiro aluno
36. Matricular segundo aluno
37. Conflito: matrícula repetida
38. Conflito: outra turma do mesmo período
39. Rematricular em outro semestre
40. Consultar histórico de matrículas
41. Listar alunos com matrícula ativa
42. Inativar primeiro aluno
43. Aluno inativo oculto na lista operacional
44. Histórico inclui aluno inativo
45. Reativar primeiro aluno

**04 - Aulas, registros e datas**

46. Criar aula
47. Atualizar aula e normalizar tópicos
48. Listar aulas ativas
49. Criar registro com múltiplas habilidades
50. Criar registro do segundo aluno só com avaliações
51. Erro: registro vazio
52. Erro: habilidade outra sem descrição
53. Listar registros ativos
54. Atualizar registro
55. Erro: aula e matrícula de turmas diferentes
56. Erro: data inexistente
57. Erro: ano não bissexto
58. Erro: timestamp recusado
59. Erro: data de outro semestre
60. Erro: filtro de aulas com data inexistente
61. Erro: filtro de registros com data inexistente

**05 - Duplicidades e restauração**

62. Conflito: aula ativa repetida
63. Conflito: registro ativo repetido
64. Arquivar registro original
65. Criar registro substituto
66. Conflito: restaurar registro com substituto ativo
67. Arquivar registro substituto
68. Restaurar registro original
69. Histórico preserva registro substituto
70. Arquivar aula original
71. Criar aula substituta
72. Conflito: restaurar aula com substituta ativa
73. Arquivar aula substituta
74. Restaurar aula original
75. Histórico preserva aula substituta

**06 - Consistência dos estados**

76. Arquivar aula para validar estados
77. Erro: criar registro em aula arquivada
78. Erro: atualizar registro ativo em aula arquivada
79. Arquivar registro em aula arquivada
80. Erro: restaurar registro em aula arquivada
81. Restaurar aula para seguir demonstração
82. Restaurar registro com estrutura ativa
83. Encerrar matrícula do segundo aluno
84. Erro: criar registro em matrícula encerrada
85. Erro: atualizar registro ativo em matrícula encerrada
86. Arquivar registro em matrícula encerrada
87. Erro: restaurar registro em matrícula encerrada
88. Encerrar turma principal
89. Erro: criar aula em turma encerrada
90. Erro: atualizar aula ativa em turma encerrada
91. Erro: criar registro em turma encerrada
92. Erro: atualizar registro ativo em turma encerrada
93. Arquivar registro em turma encerrada
94. Erro: restaurar registro em turma encerrada
95. Arquivar aula em turma encerrada
96. Erro: restaurar aula em turma encerrada
97. Histórico de aulas em turma encerrada
98. Histórico de registros em turma encerrada
99. Encerrar matrícula principal
100. Histórico de alunos com matrículas encerradas
101. Reativar turma sem cascade
102. Matrícula continua encerrada após reativar turma
103. Aula continua arquivada após reativar turma

**07 - Autorização e isolamento**

104. Professor B consulta turma de A: null
105. Professor B consulta aluno de A: null
106. Professor B não matricula aluno de A
107. Professor B não lista aulas de A
108. Professor B não lista registros de A
109. Professor B não restaura aula de A
110. Professor B não restaura registro de A
111. Aulas sem autenticação
112. Aluno sem autenticação

**08 - Admin opcional**

113. Login admin previamente provisionado
114. Listar usuários como admin
115. Admin bloqueado no domínio pedagógico
116. Inativar professor B da demonstração
117. Login de usuário inativo
118. Token anterior do usuário inativo é recusado
119. Reativar professor B da demonstração
120. Novo login do professor B


## Fase 5 — Feedback e IA sob demanda

Autenticação e administração permanecem REST; todas as operações abaixo são GraphQL em `/graphql`. Criar aula ou registro não dispara IA.

### Modelo e ciclo de vida

`Feedback` pertence à matrícula e contém `tipo` (`parcial` ou `final`), `textoIAOriginal`, `textoEditado`, `geradoPorIA`, `geradoEm`, `statusEnvio`, `enviadoEm`, `status` e timestamps. A combinação matrícula/tipo admite somente um feedback ativo, protegida por consulta e índice único parcial. Parcial e final podem coexistir.

A criação manual não exige evidências nem configuração OpenAI. O texto gerado é um rascunho revisável. Marcar envio registra apenas uma confirmação humana; nenhum email, WhatsApp ou outro envio externo ocorre. Feedback enviado precisa ser desmarcado antes de edição ou regeneração. Arquivar preserva textos e datas; restaurar pode retornar `CONFLICT` se houver substituto ativo.

| Operação | Comportamento |
| --- | --- |
| `feedback(id)` | Retorna feedback próprio ou `null` para ausente/alheio |
| `feedbacks(matriculaId, tipo, statusEnvio, status)` | Padrão ativo; status aceita `ativo`, `arquivado`, `todos`; envio aceita `rascunho`, `enviado`; ordem por tipo, criação decrescente e ID como desempate |
| `criarFeedbackManual(input)` | Recebe matrícula, tipo e texto; cria rascunho sem metadados de IA |
| `gerarFeedbacks(input)` | Recebe lista explícita e não repetida de matrículas e tipo; cria ou regenera rascunhos na ordem recebida |
| `editarFeedback(id, texto)` | Altera somente o texto editado de rascunho ativo |
| `marcarFeedbackEnviado(id)` / `desmarcarFeedbackEnviado(id)` | Confirma/reverte envio manual |
| `arquivarFeedback(id)` / `restaurarFeedback(id)` | Arquivamento lógico e restauração com verificação de conflito |
| `gerarMensagemDiaria(id)` | Recebe ID do registro existente; substitui original/editada e atualiza `geradaEm` |
| `editarMensagemDiaria(id, texto)` | Mantém edição humana existente; não chama IA |

### Regras de geração e privacidade

- Mensagem diária exige registro, aula, matrícula e turma ativos e pertencentes ao professor. Usa observação e/ou avaliações; tópicos são opcionais.
- Feedback semestral permite turma e matrícula encerradas e aula arquivada. Usa somente registros ativos com conteúdo, ligados à mesma turma e matrícula.
- O lote inteiro é autorizado e validado antes da IA. Todos os textos são gerados antes de qualquer persistência: falha de geração não salva parte do lote nem substitui rascunhos existentes.
- Falhas durante a persistência podem deixar parte do lote salva; não há transação abrangendo as escritas. O índice protege duplicidades concorrentes; a regeneração não sobrescreve feedback marcado como enviado ou arquivado durante a chamada.
- Os resolvers constroem objetos explícitos com dados pedagógicos. Contato do responsável, IDs, email do professor, tokens e credenciais não são incluídos no contexto enviado aos serviços. Não há log nem persistência de prompts completos.
- O prompt usa estilo fixo em português e orienta a não inventar fatos, comparar alunos ou produzir diagnósticos. O professor deve revisar o resultado; instruções de prompt não garantem a qualidade de uma saída real.
- Limites: até 40 registros ativos mais recentes em ordem cronológica, recorte sinalizado; textos de até 1.000 caracteres por campo, nomes de até 120, até 20 tópicos/avaliações por registro. Saída: 300 tokens na mensagem diária e 900 no feedback; temperatura 0,3, timeout de 30 segundos por chamada, sem retentativa automática e `store: false`.
- Configuração ausente retorna `IA_NOT_CONFIGURED`; indisponibilidade, recusa ou saída inválida retorna `IA_UNAVAILABLE`. As mensagens públicas são controladas, sem erro bruto do provedor. O servidor mantém a configuração de ausência de stacktrace.

### Variáveis adicionais e roteiro da pasta 09

IDs capturados automaticamente, todos exportados vazios: `turmaIAId`, `matriculaIAId`, `matriculaIAId2`, `aulaIAId`, `registroIAId`, `registroIAId2`, `feedbackParcialId`, `feedbackFinalId`, `feedbackSubstitutoId`, `feedbackFinalId2`. As flags `executarIA` e `testarIASemConfiguracao` são exportadas como `false` e não devem ser habilitadas simultaneamente. A preparação da pasta limpa os IDs novos antes de criar dados.

A coleção preserva as 120 requisições anteriores e adiciona 53, totalizando 173. Ordem da nova pasta:

121. Preparar turma para Feedback e IA
122. Preparar matrícula IA 1
123. Preparar matrícula IA 2
124. Preparar aula com tópicos
125. Preparar registro IA 1
126. Preparar registro IA 2
127. Feedback sem autenticação
128. Admin bloqueado no feedback
129. Criar parcial manual
130. Criar final manual
131. Duplicidade parcial ativa
132. Texto vazio
133. Tipo inválido
134. Listar feedbacks ativos
135. Filtrar parciais pendentes
136. Editar parcial
137. Confirmar envio manual
138. Listar enviados
139. Bloquear edição de enviado
140. Bloquear regeneração de enviado antes da IA
141. Desmarcar envio
142. Editar após desmarcar
143. Arquivar parcial
144. Consultar histórico
145. Criar substituto parcial
146. Restauração conflitante
147. Arquivar substituto
148. Restaurar original
149. Professor B consulta feedback de A
150. Professor B não altera feedback de A
151. Professor B não gera mensagem de A
152. Professor B não gera feedback de A
153. Lista de matrículas vazia
154. Matrícula repetida no lote
155. Lote com matrícula sem evidências
156. Gerar mensagem diária sob demanda
157. Revisar mensagem diária
158. Regenerar mensagem diária
159. IA diária sem configuração — ambiente separado
160. IA feedback sem configuração — ambiente separado
161. Gerar parcial individual após desmarcar envio
162. Gerar final em lote na ordem selecionada
163. Arquivar registro para excluir evidência
164. Lote com registro arquivado não gera
165. Restaurar evidência
166. Arquivar aula preservando evidências históricas
167. Mensagem diária bloqueada em aula arquivada
168. Encerrar matrícula IA
169. Encerrar turma IA
170. Regenerar final histórico com estrutura encerrada
171. Editar feedback após encerramento
172. Confirmar envio após encerramento
173. Consultar final enviado no histórico


### Validação e limitações de entrega

Os testes locais usam modelos e provedor simulados, sem MongoDB ou OpenAI reais. Permanecem pendentes: execução manual da coleção, confirmação do índice parcial de Feedback no MongoDB, concorrência real de escritas e avaliação humana dos textos produzidos pelo modelo configurado. Validar o caminho manual mesmo quando as gerações opcionais estiverem puladas.

Não há frontend, envio automático, agendamento, relatório bimestral, treinamento de modelo ou diagnóstico. Esses recursos permanecem fora desta entrega.
