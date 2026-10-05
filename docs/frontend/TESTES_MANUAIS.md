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

_(preencher ao concluir a fase)_

---

## Fase 4 — Pedro Henrique (aulas, registros, mensagem diária)

_(preencher ao concluir a fase)_

---

## Fase 5 — Thayslan Costa (feedbacks e integração final)

_(preencher ao concluir a fase)_
