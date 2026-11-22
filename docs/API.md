# Contrato da API

API REST do Gerenciador de Tarefas Online. Tudo em JSON, UTF-8.
Base local: `http://127.0.0.1:3333`. Documentação interativa (Swagger): `/docs`.

## Convenções

- **Autenticação:** `Authorization: Bearer <accessToken>` em todas as rotas, exceto as marcadas como públicas.
- **Identificadores:** UUID (string).
- **Datas de calendário** (`startDate`, `dueDate`): string `YYYY-MM-DD`, sem fuso.
- **Instantes** (`createdAt`, `updatedAt`, `completedAt`): ISO 8601 em UTC.
- **Erros:** `{ "statusCode": number, "error": string, "message": string, "details"?: [{ "path": string, "message": string }] }`.
  Mensagens em português. `details` só aparece em erro de validação (400).
- **Códigos:** 400 validação, 401 sem token ou token inválido, 403 sem permissão, 404 não encontrado
  (inclusive quando o recurso existe mas o usuário não é membro do projeto), 409 conflito, 429 muitas tentativas.

## Tipos

```ts
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';      // A fazer | Em andamento | Concluído
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
type MemberRole = 'OWNER' | 'MEMBER';

type User = { id: string; name: string; email: string };

type Member = { user: User; role: MemberRole; addedAt: string };

type ProjectSummary = {
  id: string; name: string; description: string | null;
  startDate: string; dueDate: string;
  role: MemberRole;                      // papel de quem está consultando
  memberCount: number;
  taskCounts: { TODO: number; IN_PROGRESS: number; DONE: number };
  createdAt: string; updatedAt: string;
};

type Project = ProjectSummary & { members: Member[] };

type Task = {
  id: string; projectId: string;
  title: string; description: string | null;
  status: TaskStatus; priority: TaskPriority;
  position: number;                      // ordem dentro da coluna, começa em 0
  dueDate: string | null;
  assignee: User | null;
  createdBy: User;
  completedAt: string | null;
  createdAt: string; updatedAt: string;
};

type TaskWithProject = Task & { project: { id: string; name: string } };

type CalendarEvent =
  | { kind: 'TASK'; date: string; task: TaskWithProject }
  | { kind: 'PROJECT_DEADLINE'; date: string; project: { id: string; name: string } };
```

## Rotas

### Saúde

| Método | Rota | Público | Resposta |
|---|---|---|---|
| GET | `/health` | sim | `200 { "status": "ok" }` |

### Autenticação

| Método | Rota | Público | Corpo | Resposta |
|---|---|---|---|---|
| POST | `/auth/register` | sim | `{ name, email, password }` | `201 { user: User, accessToken }` · 409 se o e-mail já existe |
| POST | `/auth/login` | sim | `{ email, password }` | `200 { user: User, accessToken }` · 401 `E-mail ou senha inválidos` |
| GET | `/auth/me` | não | — | `200 User` |

Regras: `name` 2–80 caracteres; `email` válido, guardado em minúsculas; `password` 8–72 caracteres.
O login responde com a mesma mensagem para e-mail inexistente e senha errada.
`/auth/login` e `/auth/register` têm limite de 10 tentativas por minuto por IP.

### Usuários

| Método | Rota | Resposta |
|---|---|---|
| GET | `/users?search=<texto>` | `200 User[]` — até 10 usuários cujo nome ou e-mail contém o texto (mínimo 2 caracteres; menos que isso devolve `[]`) |

### Projetos

| Método | Rota | Quem pode | Corpo | Resposta |
|---|---|---|---|---|
| GET | `/projects` | autenticado | — | `200 ProjectSummary[]` (só projetos de que participa, por `dueDate` crescente) |
| POST | `/projects` | autenticado | `{ name, description?, startDate, dueDate, memberIds?: string[] }` | `201 Project` (quem cria vira `OWNER`) |
| GET | `/projects/:id` | membro | — | `200 Project` |
| PATCH | `/projects/:id` | dono | `{ name?, description?, startDate?, dueDate? }` | `200 Project` |
| DELETE | `/projects/:id` | dono | — | `204` (apaga tarefas e vínculos) |
| POST | `/projects/:id/members` | dono | `{ userId }` | `201 Member` · 409 se já é membro |
| DELETE | `/projects/:id/members/:userId` | dono | — | `204` · 409 ao tentar remover o dono |

Regras: `name` 2–80; `description` até 500; `dueDate >= startDate`.
Ao remover um membro, as tarefas atribuídas a ele no projeto ficam sem responsável.

### Tarefas

| Método | Rota | Quem pode | Corpo | Resposta |
|---|---|---|---|---|
| GET | `/projects/:id/tasks` | membro | — | `200 Task[]` (por `status`, depois `position`) |
| POST | `/projects/:id/tasks` | membro | `{ title, description?, priority?, dueDate?, assigneeId?, status? }` | `201 Task` (entra no fim da coluna; `status` padrão `TODO`, `priority` padrão `MEDIUM`) |
| GET | `/tasks/:id` | membro | — | `200 Task` |
| PATCH | `/tasks/:id` | membro | `{ title?, description?, priority?, dueDate?, assigneeId? }` | `200 Task` |
| PATCH | `/tasks/:id/move` | membro | `{ status, position }` | `200 Task[]` (todas as tarefas do projeto, já reordenadas) |
| DELETE | `/tasks/:id` | dono do projeto ou quem criou a tarefa | — | `204` |

Regras: `title` 2–120; `description` até 2000; `assigneeId` precisa ser membro do projeto (senão 400);
`dueDate` e `assigneeId` aceitam `null` para limpar.
Mover para `DONE` grava `completedAt`; sair de `DONE` apaga `completedAt`.
`position` fora do intervalo é ajustado para o fim da coluna.

### Minhas tarefas, calendário e resumo

| Método | Rota | Resposta |
|---|---|---|
| GET | `/me/tasks?status=<TaskStatus>` | `200 TaskWithProject[]` — tarefas atribuídas a mim, por `dueDate` (sem data por último) |
| GET | `/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` | `200 CalendarEvent[]` — tarefas com prazo e prazos de projeto no intervalo (máximo 92 dias), dos projetos de que participo |
| GET | `/calendar.ics` | `200 text/calendar` — os mesmos eventos (sem limite de intervalo) em formato iCalendar, para importar no Google Agenda, Outlook etc. |
| GET | `/dashboard/summary` | `200 { projectCount, openTaskCount, overdueTaskCount, dueThisWeekCount, upcoming: TaskWithProject[] }` |

`openTaskCount`, `overdueTaskCount` e `dueThisWeekCount` consideram tarefas atribuídas a mim e não concluídas.
`upcoming` traz até 8 tarefas minhas não concluídas com prazo, da mais próxima para a mais distante.
"Hoje" é calculado no fuso `America/Sao_Paulo`.
