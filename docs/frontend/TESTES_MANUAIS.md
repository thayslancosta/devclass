# DevClass — Testes manuais do frontend

Cada responsável acrescenta sua seção, seguindo o roteiro
`02_ROTEIRO_FRONTEND_POR_INTEGRANTE.md`. Não anexar tokens, IDs de banco,
senha ou logs extensos.

## Fase 1 — Walter (fundação, acesso, meusAlunos)

**Versão:** branch `frontend-fase-1-walter`, a partir da `main` já com as
Fases 1-3 do backend mescladas.

**Ambiente:** Node 20.x. Backend em `npm start` na raiz (porta 3000);
frontend em `npm run dev` dentro de `frontend/` (porta 5173, via proxy do
Vite). Nenhum valor de credencial listado aqui.

**Fluxos executados:**
- [ ] Cadastro de professor de demonstração e login
- [ ] Login com senha incorreta — mensagem legível, formulário preservado
- [ ] Recarregar página autenticada — sessão restaurada sem flash de
      conteúdo incorreto
- [ ] Logout e acesso direto a rota protegida — redireciona ao login,
      cache Apollo limpo
- [ ] Professor tentando abrir `/admin/usuarios` — bloqueado, sem
      disparo de consulta pedagógica
- [ ] `meusAlunos` com dois professores diferentes — cada um só vê os
      próprios alunos
- [ ] `meusAlunos` sem token / com perfil errado / status inválido —
      `UNAUTHENTICATED`, `FORBIDDEN`, `BAD_USER_INPUT`
- [ ] Login com conta admin de demonstração — vai para `/admin/usuarios`,
      sem consulta pedagógica automática

**Resultado:** _(preencher após rodar localmente: passou / falhou / pendente)_

**Pendências conhecidas:**
- `/turmas` e `/admin/usuarios` usam telas placeholder explicitamente
  provisórias, substituídas pela Fase 2 (João).
- `meusAlunos` ainda não tem busca por nome nem filtro por turma/semestre —
  previsto para a Fase 3 (Ramon), reaproveitando `src/graphql/alunos.js`.

---

## Fase 2 — João Vitor (turmas, semestres, admin)

**Versão:** branch local `correcao-fase-2`, atualizada por fast-forward até `origin/main` em `99b8b64`.

**Ambiente:** Node 24.13.1; backend na raiz do repositório (porta 3000) e frontend em `frontend/` (Vite na porta 5173, via proxy). Nenhum valor de credencial listado.

**Implementado:** dashboard com filtros de semestre e situação sincronizados à URL; criar/editar/encerrar/reativar turma via GraphQL; detalhe carregado pela URL com abas e `Outlet`; lista admin via REST com filtros e alteração de situação. A interface bloqueia a alteração da própria conta admin.

**Verificações automatizadas:** `npm run lint` e `npm run build` passaram (Vite 5.4.21; 618 módulos transformados); documentos GraphQL importados e analisados; `git diff --check` passou.

**Fluxos manuais (pendentes de execução com backend e contas de demonstração):**
- [ ] Criar turma com dois encontros; confirmar lista e detalhe.
- [ ] Editar nome e horários; confirmar semestre preservado e atualização sem recarregar a página.
- [ ] Trocar semestre e situação; confirmar filtros e URL.
- [ ] Encerrar e consultar turma encerrada; reativar e confirmar que documentos relacionados mantêm sua situação.
- [ ] Tentar enviar turma sem encontro ou com campo obrigatório vazio; confirmar validação e preservação do formulário.
- [ ] Administrador filtra, inativa e reativa uma conta de professor de demonstração.
- [ ] Confirmar que a ação sobre a própria conta admin fica desabilitada.
- [ ] Tentar login com a conta inativa e confirmar mensagem genérica de erro.
- [ ] Abrir turma por URL; confirmar abas Alunos/Aulas/Feedbacks e redirecionamento inicial para Alunos.

**Resultado manual:** pendente; não marcar os fluxos acima como aprovados antes de executá-los no navegador com o backend conectado.

---

## Fase 3 — Ramon Trindade (alunos, responsáveis, matrículas)

**Versão:** branch `frontend-fase-3-ramon`, ainda sem commit.

**Ambiente:** Node 26.3.0 e npm 11.16.0. Backend real iniciado na raiz (porta 3000) e frontend em `frontend/` (Vite 5.4.21, porta 5173, via proxy). Para os testes manuais abaixo, o backend foi apontado para um MongoDB local e vazio (`devclass_fase3_ramon`), sem gravar dados no banco compartilhado do grupo. Nenhum valor de credencial listado.

**Implementado:** Meus alunos com busca e filtros locais; cadastro e edição com responsável opcional; inativar e reativar cadastro; aba Alunos da turma com filtro de matrícula; matricular aluno existente com atalho para cadastrar e voltar à seleção; encerrar matrícula; perfil do aluno com matrículas históricas e ponto de integração para registros e feedbacks.

**Verificações automatizadas:** `npm --prefix frontend run lint` e `npm --prefix frontend run build` passaram; `git diff --check` passou.

**Fluxos manuais executados em 05/10/2026 com MongoDB local:**
- [x] Entrar como professor, criar turma ativa e abrir a aba Alunos.
- [x] Criar aluno sem responsável e encontrá-lo em Meus alunos.
- [x] Criar aluno com responsável, editar e depois remover o responsável; confirmar que nome, gênero e contato ficam vazios.
- [x] Ver aluno sem matrícula no filtro "Sem matrícula neste semestre".
- [x] Matricular aluno em turma ativa; conferir a aba da turma e o período da matrícula.
- [x] Encerrar a matrícula de um aluno de teste; conferir "Ativas", "Encerradas" e o perfil.
- [x] Consultar aluno inativo e reativar.
- [x] Recarregar `/alunos/:alunoId` e confirmar que o perfil carrega pela URL.
- [x] Tentar nova matrícula no mesmo semestre e confirmar que o aluno não aparece entre os disponíveis de outra turma.
- [x] Matricular o mesmo cadastro em uma turma de semestre posterior, sem duplicar o aluno.
- [x] Trocar a matrícula histórica selecionada no perfil.
- [x] Conferir Meus alunos, aba da turma e perfil em viewport estreito/celular.

**Fluxos ainda pendentes no ambiente da apresentação:**
- [ ] Repetir os fluxos principais usando o banco compartilhado do grupo/Atlas.

**Resultado manual:** executado parcialmente em 05/10/2026 com MongoDB local; os fluxos marcados passaram. Ainda pendente repetir no banco do grupo/ambiente da apresentação.

**Pendências:**
- Passagem para a Fase 4: criar, na conta de demonstração do grupo, uma turma ativa com ao menos dois alunos matriculados. As matrículas do percurso da apresentação não devem ser encerradas, porque não podem ser refeitas no mesmo semestre.
- As seções de registros e feedbacks do perfil são provisórias até as Fases 4 e 5 (`PerfilHistorico.jsx`).
- Criar turma em um semestre que ainda não tem turmas pode depender de abrir `/turmas?periodo=AAAA.S` pela URL, pois o seletor de semestre lista apenas o atual e os já cadastrados. Tela da Fase 2, não alterada.
- Abrir ou recarregar `/admin/usuarios` diretamente no navegador pode devolver a resposta JSON do backend, porque o proxy do Vite encaminha caminhos iniciados em `/admin`. Configuração da Fase 1, não alterada.

## Fase 4 — Pedro Henrique (aulas, registros, mensagem diária)

## Fase 4 – Pedro (aulas, registros e mensagem diária)

**Versão:** branch `frontend-fase-4-pedro`, criada a partir de `origin/main` (37dec51).
**Ambiente:** Node <cole o resultado do node -v>; backend na porta 3000 com MongoDB local temporário; frontend com `npm run dev` (Vite, porta 5173).

**Fluxos executados**
- Criar aula com tópicos e sem tópicos: passou.
- Aula com data repetida: mensagem de conflito, lista consistente: passou.
- Editar, arquivar e restaurar aula; filtros ativas/arquivadas/todas: passou.
- Registro com várias habilidades e desempenhos independentes: passou.
- Rascunho de um aluno preservado ao salvar outro: passou.
- Registro vazio recusado; "Outra habilidade" exige descrição: passou.
- Arquivar e restaurar registro: passou.
- Abrir aula pela URL após recarregar (F5): passou.
- Histórico no perfil do aluno com a data da aula: <passou/pendente>.
- Mensagem diária: <descreva: gerada, editada, salva e copiada / apenas aviso de IA não configurada>.
- Viewport estreito (~390 px) sem rolagem horizontal: <passou/pendente>.
- `npm run lint` e `npm run build` em `frontend/`: passaram.

**Pendências**
- <Ex.: geração real de IA não testada por falta de OPENAI_API_KEY no ambiente de teste.>

## Fase 5 — Thayslan Costa (feedbacks e integração final)

_(preencher ao concluir a fase)_
