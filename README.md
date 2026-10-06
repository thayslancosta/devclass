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

O Vite inicia em `http://localhost:5173` e encaminha `/auth`, `/api/admin` e `/graphql` para `http://localhost:3000`. O prefixo `/api/admin` é reescrito para `/admin` no backend, preservando a rota visual `/admin/usuarios` do React ao recarregar a página. Para apontar o proxy para outro endereço durante o desenvolvimento, configure `DEV_API_TARGET` no arquivo local `frontend/.env`; esse arquivo não deve ser versionado.

O frontend usa Apollo Client 4 com RxJS. O professor pode administrar turmas por semestre e navegar pelas abas Alunos, Aulas e Feedbacks. A conta admin pode listar e ativar ou inativar usuários.

Para verificar o frontend:

```bash
npm run lint
npm run build
```

### Alunos, responsáveis e matrículas (Fase 3)

| Rota | Conteúdo |
| --- | --- |
| `/alunos` | Meus alunos: todos os cadastros do professor, com ou sem matrícula |
| `/alunos/:alunoId` | Perfil: cadastro, matrículas históricas e histórico da matrícula selecionada |
| `/turmas/:turmaId/alunos` | Aba Alunos da turma: matrículas, matricular aluno existente e encerrar matrícula |

- **Meus alunos** carrega `meusAlunos(status: "todos")` uma vez e filtra na tela: busca por nome, situação do cadastro (inicialmente ativos), semestre, turma e matrícula no semestre. "Sem matrícula neste semestre" significa não ter nenhuma matrícula no período, nem mesmo encerrada.
- **Cadastro e edição** exigem nome e gênero gramatical, informado pelo professor. O responsável é opcional; gênero ou contato do responsável exigem o nome. Remover o responsável limpa nome, gênero e contato juntos.
- **Situação do cadastro** (ativo ou inativo) e **situação da matrícula** (ativa ou encerrada) são independentes. Inativar um cadastro não encerra matrículas e preserva o histórico. Na aba da turma, o filtro "Ativas" é a visão operacional e não mostra alunos com cadastro inativo; "Todas" mostra o histórico completo.
- **Matricular** seleciona um cadastro ativo que ainda não tem matrícula no semestre da turma. Quem não encontrar o aluno pode cadastrá-lo ali mesmo e voltar à seleção.
- **Encerrar matrícula** é definitivo: o backend não oferece restauração nem transferência, e o aluno não pode ser matriculado de novo no mesmo semestre.

Pontos de integração:

- `frontend/src/features/alunos/useAlunosDaTurma.js`: `useAlunosDaTurma(turmaId, status)` devolve `itens` com `{ aluno, matricula }`, já pareando cada aluno com a matrícula daquela turma.
- `frontend/src/features/alunos/PerfilHistorico.jsx`: recebe `{ aluno, matricula }` da matrícula selecionada no perfil e integra registros (Fase 4) e feedbacks (Fase 5).
- A matrícula selecionada no perfil fica na URL (`/alunos/:alunoId?matricula=<id>`). Sem o parâmetro, o perfil seleciona a matrícula do semestre em uso ou, se não houver, a mais recente.
- `matricula.id` é o identificador usado em `registros(matriculaId)`, `feedbacks(matriculaId)` e `encerrarMatricula(id)`; o ID do aluno não serve para essas operações.

### Feedbacks e integração final (Fase 5)

A aba `/turmas/:turmaId/feedbacks` reúne as matrículas da turma, inclusive encerradas e de alunos inativos. O perfil `/alunos/:alunoId?matricula=<id>` mostra os feedbacks da matrícula histórica selecionada. Os filtros distinguem tipo, envio e arquivamento.

- Crie feedback parcial/final manualmente ou solicite a IA explicitamente. A seleção gera uma matrícula por chamada, em sequência, com resultado individual. Uma falha de conteúdo permite seguir; falhas de sessão, serviço ou consulta interrompem as próximas chamadas. Não há retentativa automática, nem repetição dos concluídos ao gerar os selecionados pendentes.
- Revise, salve e copie; o original da IA fica expansível. Regenerar exige confirmação antes de substituir textos existentes e rascunhos locais. Atualizar consultas preserva as revisões locais.
- Depois de enviar por conta própria, confirme “Marcar como enviado”. Copiar ou salvar não marca envio; alterações locais precisam ser salvas primeiro. Desmarque o envio para editar ou regenerar. Arquivados precisam ser restaurados, respeitando o limite de um ativo por matrícula/tipo.

Percurso de apresentação: login → semestre/turma → alunos e matrículas → aula e registros → mensagem diária → feedbacks parcial/final → revisão, cópia e confirmação de envio → histórico no perfil → logout. Em outra sessão, a conta admin demonstra a lista e a situação dos usuários.

Verificação adicional, dentro de `frontend/`: `node --test tests/feedbacks.test.cjs` valida os documentos GraphQL, a sequência e os bloqueios do editor sem banco nem IA. A execução no navegador e os testes com persistência/IA real estão **pendentes**, conforme [testes manuais](docs/frontend/TESTES_MANUAIS.md).

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
