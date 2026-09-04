# DevClass — Diário de Evolução Pedagógica com IA

Backend do projeto DevClass. Documento canônico de requisitos: `Definicao_Atualizada_Projeto_DevClass.pdf`.
Roteiro de implementação por fases: `Plano_Implementacao_DevClass.pdf`.

## Stack

- Node.js (CommonJS) + Express 5
- MongoDB Atlas + Mongoose
- Autenticação JWT (Bearer Token)
- Apollo Server (GraphQL) para o domínio pedagógico
- OpenAI (integrada a partir da Fase 5)

## Como rodar o projeto

### 1. Pré-requisitos
- Node.js instalado
- Um cluster MongoDB Atlas (free tier já é suficiente) com um usuário de banco criado e o IP liberado em Network Access

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Copie `.env.example` para `.env` e preencha:
```
MONGODB_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/devclass?appName=Cluster0
PORT=3000
JWT_SECRET=uma-string-longa-e-aleatoria
OPENAI_API_KEY=
OPENAI_MODEL=
```
> `OPENAI_API_KEY` e `OPENAI_MODEL` só são usados a partir da Fase 5. Podem ficar vazios até lá.

**Nunca** commite o `.env` — ele já está no `.gitignore`.

### 4. Rodar o servidor
```bash
npm start
```
Se tudo estiver certo, aparece no terminal:
```
[database] MongoDB conectado com sucesso.
[server] Rodando em http://localhost:3000
[server] GraphQL disponível em http://localhost:3000/graphql
```
O servidor **não sobe** se o MongoDB falhar ao conectar (comportamento intencional, exigido pela especificação).

### 5. Criar a primeira conta admin
Não existe endpoint público para criar admin (regra de segurança da spec). Passos:
1. Cadastre um usuário normal em `POST /auth/register` (ele nasce como `professor`).
2. No MongoDB Atlas → Browse Collections → banco `devclass` → coleção `usuarios`, edite o campo `perfil` desse documento para `"admin"`.
3. Faça login novamente com esse usuário — o novo token virá com `perfil: "admin"`.

## Estado atual (Fase 1 concluída)

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
- Query `health` disponível para teste de contexto/autenticação.
- `context.usuario` é populado a partir do Bearer Token e disponível para todos os resolvers futuros — nunca confiar em `professorId`/`usuarioId` vindo do cliente.

### Regras de segurança já implementadas
- Senha nunca é devolvida em nenhuma resposta (hash com bcrypt, campo com `select: false`).
- Login usa mensagem genérica (`"Email ou senha inválidos."`) tanto para email inexistente quanto senha errada quanto usuário inativo — não revela qual foi o motivo.
- `autenticar` (middleware REST) e o `contexto` (GraphQL) sempre confirmam no banco que o usuário **ainda está ativo**, mesmo que o JWT em si continue válido.
- `autorizar('admin')` bloqueia com 403 qualquer perfil fora da lista permitida.
- Nenhuma exclusão física: usuários são inativados (`ativo: false`), nunca deletados.

### Testado no Postman (collection `DevClass Backend.postman_collection.json`)
- Cadastro (201) e email duplicado (409)
- Login correto (200) e senha errada (401)
- Acesso sem token (401)
- Professor tentando rota de admin (403)
- Admin acessando rota de admin (200)
- Desativação de usuário e bloqueio de login/token subsequente (401)
- Query `health` no GraphQL, com e sem autenticação

## Handoff — para o João (Fase 2: Turmas e períodos letivos)

O que você recebe pronto:
- `src/graphql/schema.js` já expõe `typeDefs`, `resolvers` e `contexto`. Para adicionar o módulo de Turma, importe seus próprios `typeDefs`/`resolvers` em arquivos separados dentro de `src/graphql/typeDefs/` e `src/graphql/resolvers/`, e mescle-os no `schema.js` (por exemplo com `mergeTypeDefs`/`mergeResolvers` do `@graphql-tools/merge`, ou concatenando os objetos manualmente). **Não remova a Query `health`.**
- Em qualquer resolver autenticado, o usuário logado está disponível em `context.usuario` (campos: `id`, `email`, `perfil`). Use `context.usuario.id` como `professorId` ao criar/consultar Turmas — nunca aceite esse valor vindo do `input` do cliente.
- Se `context.usuario` for `null`, significa que não havia token válido — trate isso lançando um erro `UNAUTHENTICATED` nos seus resolvers antes de acessar o banco.

O que você precisa para testar:
- Um token de professor válido e ativo. Gere o seu próprio cadastrando um novo usuário via `POST /auth/register` + `POST /auth/login` — não há token fixo no repositório (proibido pela spec).
- Se precisar de uma conta admin para testes de isolamento, promova manualmente um usuário no Atlas, como descrito acima.

Antes de começar sua fase:
```bash
git checkout main
git pull
git checkout -b fase-2-turmas-joao
```

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
* Recurso de outro professor devolve sempre a mesma mensagem com código `NOT_FOUND`, para não revelar a existência de documento alheio (regra 13.3 §137).
* Nenhuma exclusão física: sem `delete`, `findByIdAndDelete`, `deleteOne` ou `deleteMany`.

## Códigos de erro (seção 11.8)

| Código | Quando |
| --- | --- |
| `UNAUTHENTICATED` | sem token válido |
| `BAD_USER_INPUT` | enum, ID ou responsável incoerente |
| `NOT_FOUND` | recurso inexistente ou de outro professor |
| `CONFLICT` | matrícula duplicada no mesmo período |

## Testes

A collection tem a pasta `04 - Alunos e matrículas` com 20 requisições na ordem de execução, com testes automáticos que gravam `alunoId`, `alunoId2`, `matriculaId` e `matriculaId2` nas variáveis.

Preencha antes: `baseUrl`, `professorToken`, `professorTokenB`, `turmaId`, `turmaIdMesmoPeriodo` (outra turma do **mesmo** período), `turmaIdOutroSemestre` e `turmaIdProfessorB`.

## Pendências registradas

* **Índice único sem filtro de status.** Se o grupo quiser permitir troca de turma dentro do mesmo semestre, será preciso um índice parcial (`partialFilterExpression: { status: 'ativa' }`) — é mudança de regra e exige atualizar a especificação antes.
* **`alunosDaTurma` filtra por status da matrícula, não do aluno.** Um aluno `inativo` com matrícula `ativa` ainda aparece. A regra 17.1 §160 sugere ocultar inativos na visão padrão; o plano pede "liste alunos por matrícula ativa da turma". Pendente de decisão do grupo.
* **`atualizarTurma` (Fase 2) exige `periodoLetivo` no input mas ignora o valor.** Corrigir exigiria um `AtualizarTurmaInput` separado, mudando o contrato que o Postman da Fase 2 já usa. Não alterado.
