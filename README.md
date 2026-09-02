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
