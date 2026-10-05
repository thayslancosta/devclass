# DevClass

O DevClass é uma aplicação web para apoiar o diário de evolução pedagógica de professores de uma escola de línguas. O repositório contém o backend e o frontend React em `frontend/`.

## Funcionalidades

- Cadastro e login de professores com autenticação JWT.
- Administração de usuários por conta com perfil `admin`.
- Cadastro de turmas e consulta por período letivo.
- Cadastro de alunos, responsáveis e matrículas.
- Aulas e registros pedagógicos com múltiplas habilidades.
- Arquivamento lógico e consulta do histórico.
- Geração sob solicitação de mensagens diárias e feedbacks parciais ou finais com a OpenAI.
- Edição dos textos antes do envio e confirmação manual de envio.

A aplicação não envia mensagens por email, WhatsApp ou outro canal. O campo de envio registra somente a confirmação feita pelo professor depois da comunicação ocorrer fora do sistema.

## Tecnologias

- Node.js e CommonJS
- Express 5
- Apollo Server 5 e GraphQL
- MongoDB com Mongoose
- JSON Web Token
- bcryptjs
- dotenv
- SDK OpenAI

## Organização da aplicação

- `src/controllers`: regras das rotas REST de autenticação e administração.
- `src/routes`: definição dos endereços REST.
- `src/middlewares`: autenticação e autorização das rotas REST.
- `src/models`: schemas e índices do Mongoose.
- `src/graphql/typeDefs`: tipos, inputs, queries e mutations GraphQL.
- `src/graphql/resolvers`: consultas, alterações e autorização do domínio pedagógico.
- `src/services`: montagem dos prompts e chamada tardia da OpenAI.
- `src/utils`: tratamento comum de erros REST.

## REST e GraphQL

O projeto usa REST para autenticação e administração de usuários. Turmas, alunos, matrículas, aulas, registros e feedbacks ficam no endpoint GraphQL.

| Método | Endereço | Uso |
| --- | --- | --- |
| POST | `/auth/register` | Cadastro público de professor |
| POST | `/auth/login` | Login e emissão do token |
| GET | `/admin/usuarios` | Listagem de usuários por administrador |
| PATCH | `/admin/usuarios/:id/status` | Ativação ou inativação de usuário |
| POST | `/graphql` | Domínio pedagógico |

A rota de cadastro implementada no código é `/auth/register`. As rotas administrativas exigem Bearer token de um usuário com perfil `admin`.

## Configuração

As variáveis usadas pela aplicação estão listadas em `.env.example`:

| Variável | Uso |
| --- | --- |
| `MONGODB_URI` | Conexão com o MongoDB |
| `PORT` | Porta HTTP do servidor |
| `JWT_SECRET` | Assinatura dos tokens JWT |
| `OPENAI_API_KEY` | Credencial usada apenas nas gerações solicitadas |
| `OPENAI_MODEL` | Modelo usado pelo serviço de IA |

A falta das variáveis da OpenAI não impede o servidor de iniciar, mas uma solicitação de geração retorna `IA_NOT_CONFIGURED`. A aplicação conecta ao MongoDB antes de abrir a porta HTTP.

```bash
npm install
npm start
```

Durante o desenvolvimento também pode ser usado:

```bash
npm run dev
```

## Frontend

Com o backend iniciado na raiz do repositório, abra outro terminal:

```bash
cd frontend
npm ci
npm run dev
```

O Vite inicia em `http://localhost:5173` e encaminha `/auth`, `/admin` e `/graphql` para `http://localhost:3000`. Para apontar o proxy para outro endereço durante o desenvolvimento, configure `DEV_API_TARGET` no arquivo local `frontend/.env`; esse arquivo não deve ser versionado.

O frontend usa Apollo Client 4 com RxJS. Na Fase 2, o professor pode consultar e administrar turmas por semestre, e a conta admin pode listar e ativar ou inativar usuários. A tela da turma já oferece navegação por Alunos, Aulas e Feedbacks para as fases seguintes.

Para verificar o frontend:

```bash
npm run lint
npm run build
```

## Regras principais

- A identidade do professor vem do token; os inputs pedagógicos não escolhem o proprietário dos dados.
- Recursos de outro professor não são expostos pelas operações protegidas.
- Alunos e usuários mudam de status, enquanto aulas, registros e feedbacks são arquivados. Não há operação de exclusão física no domínio.
- Para criar ou restaurar um registro ativo, turma, aula e matrícula precisam estar ativas e pertencer ao mesmo contexto.
- Uma turma não pode ter duas aulas ativas na mesma data.
- Uma matrícula não pode ter dois registros ativos na mesma aula.
- Datas de aula usam `AAAA-MM-DD` e precisam pertencer ao período letivo da turma.
- A IA é chamada somente nas mutations solicitadas pelo professor.
- Uma mensagem diária exige a estrutura operacional ativa.
- Feedbacks podem ser `parcial` ou `final` e continuam disponíveis para trabalho histórico mesmo com turma ou matrícula encerrada.
- Um feedback enviado não pode ser editado ou regenerado até que o envio seja desmarcado.
- O contato do responsável não é incluído nos dados enviados ao serviço de IA.

## Roteiro aprovado de testes

As operações GraphQL usam estes headers:

```text
Content-Type: application/json
Authorization: Bearer <TOKEN>
```

Os valores `<TURMA_ID>`, `<ALUNO_ID>`, `<MATRICULA_ID>`, `<AULA_ID>`, `<REGISTRO_ID>` e `<FEEDBACK_ID>` vêm das respostas anteriores. O login fornece o `<TOKEN>`.

### 1. Login

- Método e endereço: `POST {{baseUrl}}/auth/login`
- Bearer token: Não

```json
{
  "email": "professor.demo@example.com",
  "senha": "123456"
}
```

Guardar: `token`.

Resultado principal: HTTP 200 e token retornado.

### 2. Criar turma

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($input: TurmaInput!) { criarTurma(input: $input) { id nome estagio periodoLetivo status } }",
  "variables": {
    "input": {
      "nome": "Turma Apresentação",
      "estagio": "A2",
      "periodoLetivo": "2026.2",
      "encontros": [
        {
          "diaSemana": "segunda",
          "horario": "14:00"
        }
      ]
    }
  }
}
```

Guardar: `data.criarTurma.id` como `<TURMA_ID>`.

Resultado principal: HTTP 200, `status: "ativa"` e ausência de `errors`.

### 3. Criar aluno

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($input: CriarAlunoInput!) { criarAluno(input: $input) { id nome generoGramatical nomeResponsavel generoResponsavel contatoResponsavel status } }",
  "variables": {
    "input": {
      "nome": "Ana Apresentação",
      "generoGramatical": "feminino",
      "nomeResponsavel": "Marina",
      "generoResponsavel": "feminino",
      "contatoResponsavel": "marina@example.com"
    }
  }
}
```

Guardar: `data.criarAluno.id` como `<ALUNO_ID>`.

Resultado principal: HTTP 200, `status: "ativo"` e ausência de `errors`.

### 4. Matricular aluno

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($alunoId: ID!, $turmaId: ID!) { matricularAluno(alunoId: $alunoId, turmaId: $turmaId) { id alunoId turmaId status } }",
  "variables": {
    "alunoId": "<ALUNO_ID>",
    "turmaId": "<TURMA_ID>"
  }
}
```

Guardar: `data.matricularAluno.id` como `<MATRICULA_ID>`.

Resultado principal: HTTP 200, `status: "ativa"` e ausência de `errors`.

### 5. Criar aula

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($input: CriarAulaInput!) { criarAula(input: $input) { id turmaId data topicos status } }",
  "variables": {
    "input": {
      "turmaId": "<TURMA_ID>",
      "data": "2026-09-08",
      "topicos": [
        "Present perfect",
        "Experiências pessoais"
      ]
    }
  }
}
```

Guardar: `data.criarAula.id` como `<AULA_ID>`.

Resultado principal: HTTP 200, `status: "ativa"` e ausência de `errors`.

### 6. Adicionar registro diário

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($input: CriarRegistroInput!) { adicionarRegistro(input: $input) { id aulaId matriculaId observacaoGeral avaliacoes { habilidade desempenho observacao } status } }",
  "variables": {
    "input": {
      "aulaId": "<AULA_ID>",
      "matriculaId": "<MATRICULA_ID>",
      "observacaoGeral": "Participou bem das atividades em dupla.",
      "avaliacoes": [
        {
          "habilidade": "speaking",
          "desempenho": "destaque",
          "observacao": "Falou com confiança e utilizou o conteúdo da aula."
        },
        {
          "habilidade": "listening",
          "desempenho": "precisa_de_atencao",
          "observacao": "Precisou ouvir algumas instruções novamente."
        }
      ]
    }
  }
}
```

Guardar: `data.adicionarRegistro.id` como `<REGISTRO_ID>`.

Resultado principal: HTTP 200, duas avaliações, `status: "ativo"` e ausência de `errors`.

### 7. Gerar mensagem diária com IA

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($id: ID!) { gerarMensagemDiaria(id: $id) { id mensagemIAOriginal mensagemEditada geradaEm status } }",
  "variables": {
    "id": "<REGISTRO_ID>"
  }
}
```

Resultado principal: HTTP 200, textos original e editável preenchidos e ausência de `errors`.

### 8. Editar mensagem diária

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($id: ID!, $texto: String!) { editarMensagemDiaria(id: $id, texto: $texto) { id mensagemIAOriginal mensagemEditada geradaEm status } }",
  "variables": {
    "id": "<REGISTRO_ID>",
    "texto": "Mensagem revisada pelo professor."
  }
}
```

Resultado principal: HTTP 200, texto original preservado e `mensagemEditada` atualizada.

### 9. Gerar feedback parcial com IA

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($input: GerarFeedbacksInput!) { gerarFeedbacks(input: $input) { id matriculaId tipo textoIAOriginal textoEditado geradoPorIA geradoEm statusEnvio enviadoEm status } }",
  "variables": {
    "input": {
      "matriculaIds": [
        "<MATRICULA_ID>"
      ],
      "tipo": "parcial"
    }
  }
}
```

Guardar: `data.gerarFeedbacks[0].id` como `<FEEDBACK_ID>`.

Resultado principal: HTTP 200, `geradoPorIA: true`, `statusEnvio: "rascunho"` e `status: "ativo"`.

### 10. Listar feedbacks

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "query ($matriculaId: ID!) { feedbacks(matriculaId: $matriculaId, status: \"ativo\") { id matriculaId tipo textoEditado geradoPorIA statusEnvio status } }",
  "variables": {
    "matriculaId": "<MATRICULA_ID>"
  }
}
```

Resultado principal: HTTP 200 e feedback parcial presente em `data.feedbacks`.

### 11. Editar feedback

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($id: ID!, $texto: String!) { editarFeedback(id: $id, texto: $texto) { id textoIAOriginal textoEditado statusEnvio status } }",
  "variables": {
    "id": "<FEEDBACK_ID>",
    "texto": "Feedback revisado e aprovado pelo professor."
  }
}
```

Resultado principal: HTTP 200, `textoEditado` atualizado e texto original preservado.

### 12. Confirmar envio do feedback

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($id: ID!) { marcarFeedbackEnviado(id: $id) { id textoEditado statusEnvio enviadoEm status } }",
  "variables": {
    "id": "<FEEDBACK_ID>"
  }
}
```

Resultado principal: HTTP 200, `statusEnvio: "enviado"` e `enviadoEm` preenchido.

### 13. Demonstrar o bloqueio de edição após o envio

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($id: ID!, $texto: String!) { editarFeedback(id: $id, texto: $texto) { id textoEditado statusEnvio } }",
  "variables": {
    "id": "<FEEDBACK_ID>",
    "texto": "Tentativa de alteração."
  }
}
```

Resultado principal: HTTP 200, `data: null`, erro GraphQL com `extensions.code: "CONFLICT"`.

### 14. Arquivar feedback

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "mutation ($id: ID!) { arquivarFeedback(id: $id) { id tipo statusEnvio status } }",
  "variables": {
    "id": "<FEEDBACK_ID>"
  }
}
```

Resultado principal: HTTP 200 e `status: "arquivado"`.

### 15. Consultar o histórico

- Método e endereço: `POST {{baseUrl}}/graphql`
- Bearer token: Sim

```json
{
  "query": "query ($matriculaId: ID!) { feedbacks(matriculaId: $matriculaId, status: \"todos\") { id tipo textoEditado statusEnvio enviadoEm status } }",
  "variables": {
    "matriculaId": "<MATRICULA_ID>"
  }
}
```

Resultado principal: HTTP 200 e feedback arquivado ainda presente em `data.feedbacks`.

## Limitações

- O servidor depende de uma conexão configurada com MongoDB.
- As gerações dependem de uma chave e de um modelo OpenAI configurados no servidor.
- Os textos gerados precisam de revisão do professor.
- O envio ao responsável não é automatizado.
- Contas administrativas são provisionadas separadamente; o cadastro público sempre cria um professor.
- O projeto foi desenvolvido para uso acadêmico e demonstração. Não houve validação para implantação em produção.
