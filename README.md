# Gerenciador de Tarefas Online

Projeto Integrador III-B — Análise e Desenvolvimento de Sistemas (PUC Goiás, EaD).

Sistema web para organizar, acompanhar e controlar as tarefas dos projetos de uma equipe.
Foi desenvolvido como projeto de extensão em parceria com a TREE.IA, empresa de tecnologia.

## Funcionalidades

- **Cadastro e autenticação**: criar conta, entrar e sair; todas as telas exigem sessão.
- **Projetos**: criar projetos com data de início, prazo e membros. Só o dono edita o projeto e
  gerencia os membros.
- **Tarefas**: criar, atribuir, editar, mover e concluir. Cada tarefa tem responsável, prioridade
  e prazo.
- **Quadro Kanban**: colunas "A fazer", "Em andamento" e "Concluído", com arrastar e soltar,
  movimentação pelo teclado e pelo menu de cada cartão.
- **Minhas tarefas**: tudo o que está atribuído à pessoa, em todos os projetos, agrupado por
  urgência.
- **Calendário**: prazos das tarefas e dos projetos em visão mensal, com exportação em `.ics`
  para Google Agenda e Outlook.
- **Início**: resumo com tarefas abertas, atrasadas e próximas entregas.

## Arquitetura

```
Navegador ──> web (Next.js) ──> api (NestJS) ──> PostgreSQL
              telas + BFF        regras + REST     dados
```

- **`api/`** — API REST em NestJS 11 com Prisma 7 e PostgreSQL. Concentra as regras: quem pode
  ver e alterar cada projeto, a ordem das tarefas no quadro, o calendário e o resumo.
  O contrato está em [`docs/API.md`](docs/API.md) e a documentação interativa em `/docs` (Swagger).
- **`web/`** — interface em Next.js 16, React 19 e Tailwind 4. As rotas `/api/*` do próprio Next
  funcionam como BFF: guardam o token da sessão em cookie `HttpOnly` e repassam as chamadas para
  a API, de modo que o navegador nunca tem acesso ao token.
- **`docker-compose.yml`** — PostgreSQL para desenvolvimento local.

## Como rodar localmente

Requisitos: Node.js 24, pnpm 10 e Docker.

```bash
# 1. Banco de dados
docker compose up -d

# 2. API (http://127.0.0.1:3333)
cd api
pnpm install
cp .env.example .env        # troque o JWT_SECRET (a API recusa o valor de exemplo)
pnpm db:deploy              # cria as tabelas
pnpm db:seed                # opcional: dados de demonstração
pnpm build && pnpm start

# 3. Interface (http://localhost:3000), em outro terminal
cd web
pnpm install
cp .env.example .env.local
pnpm build && pnpm start
```

### Dados de demonstração

O comando `pnpm db:seed` apaga o banco local e cria um cenário fictício com quatro pessoas,
dois projetos e catorze tarefas. Todos entram com a senha `demo12345`:

| E-mail | Nome |
|---|---|
| `helena@demo.local` | Helena Martins |
| `rafael@demo.local` | Rafael Costa |
| `beatriz@demo.local` | Beatriz Nogueira |
| `lucas@demo.local` | Lucas Andrade |

Os nomes, projetos e tarefas são inventados e servem apenas para demonstração.

## Testes

```bash
cd api
pnpm test        # testes unitários
pnpm test:int    # testes de integração (usam o PostgreSQL do docker compose)

cd web
pnpm test        # testes unitários e de componentes
```

## Segurança

- Senhas guardadas com Argon2id; o login responde da mesma forma para e-mail inexistente e
  senha errada.
- Token de acesso JWT com validade de 8 horas, mantido em cookie `HttpOnly` e `SameSite=Lax`.
- Um projeto só é visível para os seus membros; para os demais ele se comporta como inexistente.
- Requisições que alteram dados são aceitas apenas da própria origem (proteção contra CSRF).
- Limite de tentativas nas rotas de entrada e cadastro.

## Estrutura

```
api/     API REST (NestJS, Prisma, testes)
web/     interface e BFF (Next.js)
docs/    contrato da API
```
