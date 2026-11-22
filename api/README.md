# Gerenciador de Tarefas Online: API

API REST do Gerenciador de Tarefas Online, escrita com NestJS 11 (Express 5), PostgreSQL e Prisma 7.
O contrato completo (rotas, tipos e erros) está em [`../docs/API.md`](../docs/API.md) e a documentação
interativa (Swagger) fica em `http://127.0.0.1:3333/docs` com a API rodando.

## O que a API faz

- Cadastro e login com senha protegida por Argon2id e token JWT (HS256).
- Projetos com dono e membros: quem não é membro não enxerga o projeto (responde 404).
- Quadro de tarefas em três colunas (A fazer, Em andamento, Concluído) com reordenação consistente,
  mesmo com movimentos simultâneos.
- Minhas tarefas, calendário de prazos, exportação `.ics` (Google Agenda, Outlook) e resumo do painel.

## Requisitos

- Node.js 24 ou superior
- pnpm 10
- Docker (para o PostgreSQL local)

## Como rodar

Na raiz do repositório (a pasta acima de `api/`):

```bash
docker compose up -d
```

Dentro de `api/`:

```bash
pnpm install
cp .env.example .env     # depois troque o JWT_SECRET (a API recusa o valor de exemplo)
pnpm db:deploy           # aplica as migrações
pnpm db:seed             # opcional: dados de demonstração
pnpm dev                 # http://127.0.0.1:3333
```

O `pnpm install` já gera o cliente do Prisma (`src/generated/`, ignorado pelo git).

### Variáveis de ambiente (`.env`)

| Variável                 | Descrição                                                        | Padrão      |
| ------------------------ | ---------------------------------------------------------------- | ----------- |
| `DATABASE_URL`           | Conexão com o PostgreSQL                                         | obrigatória |
| `JWT_SECRET`             | Segredo de assinatura do token, com pelo menos 32 caracteres     | obrigatória |
| `JWT_EXPIRES_IN`         | Validade do token (`30m`, `8h`, `7d`)                            | `8h`        |
| `PORT`                   | Porta HTTP                                                       | `3333`      |
| `HOST`                   | Endereço de escuta                                               | `127.0.0.1` |
| `THROTTLE_DEFAULT_LIMIT` | Requisições por minuto por IP, em geral                          | `300`       |
| `THROTTLE_AUTH_LIMIT`    | Tentativas por minuto por IP em `/auth/login` e `/auth/register` | `10`        |

A API não inicia, e explica o motivo, se `JWT_SECRET` tiver menos de 32 caracteres ou se
`DATABASE_URL` estiver ausente. Para gerar um segredo:
`node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.

## Dados de demonstração

`pnpm db:seed` **apaga todos os usuários, projetos e tarefas** e recria dados fictícios para uso
local: 4 usuários, 2 projetos (uma festa comunitária e a reorganização de um arquivo de escritório) e
16 tarefas com prazos relativos à data de hoje. O script recusa rodar contra um banco que não seja
local. Todos os usuários usam a senha `demo12345`:

- `helena@demo.local`
- `rafael@demo.local`
- `beatriz@demo.local`
- `lucas@demo.local`

## Scripts

| Comando             | O que faz                                                            |
| ------------------- | -------------------------------------------------------------------- |
| `pnpm dev`          | Servidor em modo de desenvolvimento, com recarga                     |
| `pnpm build`        | Gera o cliente do Prisma e compila para `dist/`                      |
| `pnpm start`        | Executa a versão compilada (`dist/main.js`)                          |
| `pnpm typecheck`    | Verificação de tipos                                                 |
| `pnpm lint`         | ESLint, sem nenhum aviso permitido                                   |
| `pnpm format`       | Prettier                                                             |
| `pnpm test`         | Testes unitários (sem banco)                                         |
| `pnpm test:int`     | Testes de integração (PostgreSQL real)                               |
| `pnpm db:generate`  | Gera o cliente do Prisma                                             |
| `pnpm db:migrate`   | Cria e aplica uma migração em desenvolvimento (`prisma migrate dev`) |
| `pnpm db:deploy`    | Aplica as migrações existentes (`prisma migrate deploy`)             |
| `pnpm db:seed`      | Recria os dados de demonstração                                      |
| `pnpm db:reset`     | Recria o banco do zero a partir das migrações                        |
| `pnpm openapi:dump` | Escreve a especificação OpenAPI em `openapi.json`                    |

## Testes

```bash
pnpm test        # unitários: reordenação, ICS, datas, senha e token, schemas
pnpm test:int    # integração: sobe o app Nest com supertest
```

Os testes de integração precisam do PostgreSQL do `docker compose` no ar. Antes de rodar, o
`globalSetup` recria o banco `tarefas_test` no mesmo servidor e aplica as migrações nele; o banco de
desenvolvimento não é tocado. Nesses testes os limites de requisição são altos, exceto no arquivo que
verifica a resposta 429.

## Mapa de pastas

```
api/
  prisma/schema/       modelo de dados (schema.prisma)
  prisma/migrations/   migrações geradas pelo Prisma
  scripts/             seed.ts e openapi-dump.ts
  src/
    main.ts            inicialização (lê o .env, valida a configuração)
    app.module.ts      módulos, guards globais, filtro de exceções, limites de requisição
    app.setup.ts       helmet, limite de corpo, Swagger
    config/            leitura e validação das variáveis de ambiente
    infrastructure/    PrismaService e PrismaModule
    common/            guard de autenticação, decorators, filtro de exceções, datas, contrato
    docs/              montagem do documento OpenAPI
    modules/
      health/ auth/ users/ projects/ tasks/ calendar/ dashboard/
        (controller + service + dto/ com schemas zod + mappers)
  test/                preparação e testes de integração (*.int.test.ts)
```

## Decisões de projeto

- **Membro vê, não membro recebe 404.** `ProjectAccessService` é o único ponto que decide acesso;
  toda rota de projeto ou tarefa passa por ele.
- **Posição das tarefas** é um índice denso, a partir de 0, por projeto e coluna. A regra de
  reordenação é uma função pura (`src/modules/tasks/reorder.ts`). Criar, mover e excluir tarefas
  rodam em transação, com `pg_advisory_xact_lock` por projeto para serializar alterações simultâneas.
- **Datas de calendário** trafegam como `AAAA-MM-DD` e são convertidas em um único lugar
  (`src/common/dates.ts`), sempre em UTC. "Hoje" é calculado em `America/Sao_Paulo`.
- **Segurança:** Argon2id, JWT com algoritmo, emissor e audiência fixados, o usuário é recarregado a
  cada requisição, `helmet`, corpo de até 100 kB, CORS desligado, limite de tentativas por IP e
  schemas zod estritos (campos desconhecidos são rejeitados).
- Por trás de um proxy reverso, configure `trust proxy` no Express para que o limite por IP use o
  endereço real do cliente.
