import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bearer,
  createProject,
  createTask,
  createTestApp,
  http,
  route,
  registerUser,
  type TestUser,
} from './helpers';

interface TaskBody {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  position: number;
  completedAt: string | null;
}

async function listTasks(app: INestApplication, user: TestUser, projectId: string) {
  const response = await http(app)
    .get(`/projects/${projectId}/tasks`)
    .set(...bearer(user.token))
    .expect(200);
  return response.body as TaskBody[];
}

/** Titles per column in position order, also asserting that positions are dense and 0-based. */
function columns(tasks: TaskBody[]): Record<TaskBody['status'], string[]> {
  const result: Record<TaskBody['status'], string[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const status of Object.keys(result) as TaskBody['status'][]) {
    const column = tasks.filter((task) => task.status === status);
    expect(column.map((task) => task.position)).toEqual(column.map((_, index) => index));
    result[status] = column.map((task) => task.title);
  }
  return result;
}

describe('tarefas', () => {
  let app: NestExpressApplication;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let project: { id: string };

  beforeAll(async () => {
    app = await createTestApp();
    owner = await registerUser(app, 'Dona');
    member = await registerUser(app, 'Membro');
    outsider = await registerUser(app, 'Fora');
    project = await createProject(app, owner, { memberIds: [member.id] });
  });

  afterAll(async () => {
    await app.close();
  });

  const freshProject = (extra: Record<string, unknown> = {}) =>
    createProject(app, owner, { memberIds: [member.id], ...extra });

  it('cria tarefa com padrões, no fim da coluna, devolvendo o contrato completo', async () => {
    const p = await freshProject();
    const first = await createTask(app, owner, p.id, { title: 'Primeira' });
    const second = await createTask(app, member, p.id, {
      title: 'Segunda',
      description: 'detalhes',
      priority: 'HIGH',
      dueDate: '2026-08-15',
      assigneeId: member.id,
    });

    expect(first).toMatchObject({
      projectId: p.id,
      title: 'Primeira',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      position: 0,
      dueDate: null,
      assignee: null,
      completedAt: null,
      createdBy: { id: owner.id, name: owner.name, email: owner.email },
    });
    expect(second).toMatchObject({
      position: 1,
      priority: 'HIGH',
      dueDate: '2026-08-15',
      assignee: { id: member.id },
      createdBy: { id: member.id },
    });
    expect(Object.keys(second).sort()).toEqual(
      [
        'assignee',
        'completedAt',
        'createdAt',
        'createdBy',
        'description',
        'dueDate',
        'id',
        'position',
        'priority',
        'projectId',
        'status',
        'title',
        'updatedAt',
      ].sort(),
    );
  });

  it('cria direto em outra coluna e já marca completedAt quando for DONE', async () => {
    const p = await freshProject();
    const progress = await createTask(app, owner, p.id, {
      title: 'Andando',
      status: 'IN_PROGRESS',
    });
    const done = await createTask(app, owner, p.id, { title: 'Feita', status: 'DONE' });
    expect(progress).toMatchObject({ status: 'IN_PROGRESS', position: 0, completedAt: null });
    expect(done).toMatchObject({ status: 'DONE', position: 0 });
    expect(done.completedAt).toEqual(expect.any(String));
  });

  it('valida o corpo da criação', async () => {
    const asOwner = bearer(owner.token);
    await http(app)
      .post(`/projects/${project.id}/tasks`)
      .set(...asOwner)
      .send({ title: 'a' })
      .expect(400);
    await http(app)
      .post(`/projects/${project.id}/tasks`)
      .set(...asOwner)
      .send({ title: 'Título', priority: 'URGENT' })
      .expect(400);
    await http(app)
      .post(`/projects/${project.id}/tasks`)
      .set(...asOwner)
      .send({ title: 'Título', position: 3 })
      .expect(400);
    await http(app)
      .post(`/projects/${project.id}/tasks`)
      .set(...asOwner)
      .send({ title: 'Título', dueDate: '2026-02-31' })
      .expect(400);
  });

  it('exige que o responsável seja membro do projeto (400)', async () => {
    const p = await freshProject();
    const response = await http(app)
      .post(`/projects/${p.id}/tasks`)
      .set(...bearer(owner.token))
      .send({ title: 'Tarefa', assigneeId: outsider.id })
      .expect(400);
    expect(response.body.message).toBe('O responsável precisa ser membro do projeto');

    const task = await createTask(app, owner, p.id, { title: 'Outra' });
    await http(app)
      .patch(`/tasks/${task.id}`)
      .set(...bearer(owner.token))
      .send({ assigneeId: outsider.id })
      .expect(400);
    await http(app)
      .patch(`/tasks/${task.id}`)
      .set(...bearer(owner.token))
      .send({ assigneeId: randomUUID() })
      .expect(400);
  });

  it('não deixa quem não é membro ver, criar ou alterar tarefas (404)', async () => {
    const p = await freshProject();
    const task = await createTask(app, owner, p.id, { title: 'Privada' });
    const asOutsider = bearer(outsider.token);

    const create = await http(app)
      .post(`/projects/${p.id}/tasks`)
      .set(...asOutsider)
      .send({ title: 'Invasora' })
      .expect(404);
    expect(create.body.message).toBe('Projeto não encontrado');

    for (const [method, path, body] of [
      ['get', `/tasks/${task.id}`, {}],
      ['patch', `/tasks/${task.id}`, { title: 'Invasão' }],
      ['patch', `/tasks/${task.id}/move`, { status: 'DONE', position: 0 }],
      ['delete', `/tasks/${task.id}`, {}],
    ] as const) {
      const response = await route(app, method, path)
        .set(...asOutsider)
        .send(body)
        .expect(404);
      expect(response.body.message).toBe('Tarefa não encontrada');
    }
    await http(app)
      .get(`/tasks/${randomUUID()}`)
      .set(...asOutsider)
      .expect(404);
    await http(app)
      .get('/tasks/xyz')
      .set(...asOutsider)
      .expect(400);
  });

  it('edita campos, limpa dueDate e assigneeId com null, e ignora status/position', async () => {
    const p = await freshProject();
    const task = await createTask(app, owner, p.id, {
      title: 'Original',
      dueDate: '2026-09-01',
      assigneeId: member.id,
    });

    const edited = await http(app)
      .patch(`/tasks/${task.id}`)
      .set(...bearer(member.token))
      .send({ title: 'Editada', description: 'nova', priority: 'LOW' })
      .expect(200);
    expect(edited.body).toMatchObject({
      title: 'Editada',
      description: 'nova',
      priority: 'LOW',
      dueDate: '2026-09-01',
      assignee: { id: member.id },
    });

    const cleared = await http(app)
      .patch(`/tasks/${task.id}`)
      .set(...bearer(owner.token))
      .send({ dueDate: null, assigneeId: null, description: null })
      .expect(200);
    expect(cleared.body).toMatchObject({ dueDate: null, assignee: null, description: null });

    await http(app)
      .patch(`/tasks/${task.id}`)
      .set(...bearer(owner.token))
      .send({ status: 'DONE' })
      .expect(400);
    await http(app)
      .patch(`/tasks/${task.id}`)
      .set(...bearer(owner.token))
      .send({ position: 0 })
      .expect(400);
    await http(app)
      .patch(`/tasks/${task.id}`)
      .set(...bearer(owner.token))
      .send({ title: 'x' })
      .expect(400);
  });

  it('move entre colunas mantendo posições densas e corretas', async () => {
    const p = await freshProject();
    const [a, b, c, d] = [
      await createTask(app, owner, p.id, { title: 'Alfa' }),
      await createTask(app, owner, p.id, { title: 'Beta' }),
      await createTask(app, owner, p.id, { title: 'Gama' }),
      await createTask(app, owner, p.id, { title: 'Delta', status: 'IN_PROGRESS' }),
    ];
    const asMember = bearer(member.token);
    const move = (id: string, status: string, position: number) =>
      http(app)
        .patch(`/tasks/${id}/move`)
        .set(...asMember)
        .send({ status, position });

    // Across columns, into the middle.
    let response = await move(a.id, 'IN_PROGRESS', 0).expect(200);
    expect(columns(response.body)).toEqual({
      TODO: ['Beta', 'Gama'],
      IN_PROGRESS: ['Alfa', 'Delta'],
      DONE: [],
    });

    // Within a column, downwards and upwards.
    response = await move(a.id, 'IN_PROGRESS', 1).expect(200);
    expect(columns(response.body).IN_PROGRESS).toEqual(['Delta', 'Alfa']);
    response = await move(c.id, 'TODO', 0).expect(200);
    expect(columns(response.body).TODO).toEqual(['Gama', 'Beta']);

    // Out-of-range positions go to the end of the column.
    response = await move(b.id, 'DONE', 99).expect(200);
    expect(columns(response.body)).toEqual({
      TODO: ['Gama'],
      IN_PROGRESS: ['Delta', 'Alfa'],
      DONE: ['Beta'],
    });
    response = await move(c.id, 'DONE', 50).expect(200);
    expect(columns(response.body)).toEqual({
      TODO: [],
      IN_PROGRESS: ['Delta', 'Alfa'],
      DONE: ['Beta', 'Gama'],
    });

    // Moving the last remaining task of a column leaves it empty; GET agrees with the response.
    response = await move(d.id, 'TODO', 0).expect(200);
    expect(columns(response.body)).toEqual({
      TODO: ['Delta'],
      IN_PROGRESS: ['Alfa'],
      DONE: ['Beta', 'Gama'],
    });
    expect(columns(await listTasks(app, owner, p.id))).toEqual(columns(response.body));
    expect(response.body.map((t: TaskBody) => t.status)).toEqual([
      'TODO',
      'IN_PROGRESS',
      'DONE',
      'DONE',
    ]);
  });

  it('grava completedAt ao entrar em DONE e apaga ao sair', async () => {
    const p = await freshProject();
    const task = await createTask(app, owner, p.id, { title: 'Ciclo' });
    const move = async (status: string) => {
      const response = await http(app)
        .patch(`/tasks/${task.id}/move`)
        .set(...bearer(owner.token))
        .send({ status, position: 0 })
        .expect(200);
      return (response.body as TaskBody[]).find((t) => t.id === task.id)!;
    };

    const done = await move('DONE');
    expect(done.completedAt).toEqual(expect.any(String));
    expect(Math.abs(Date.now() - new Date(done.completedAt!).getTime())).toBeLessThan(60_000);

    const stillDone = await move('DONE');
    expect(stillDone.completedAt).toBe(done.completedAt);

    expect((await move('IN_PROGRESS')).completedAt).toBeNull();
    expect((await move('DONE')).completedAt).toEqual(expect.any(String));
    expect((await move('TODO')).completedAt).toBeNull();
  });

  it('valida o corpo do move', async () => {
    const task = await createTask(app, owner, project.id, { title: 'Alvo' });
    const asOwner = bearer(owner.token);
    for (const body of [
      { status: 'XYZ', position: 0 },
      { status: 'TODO', position: 'a' },
      { status: 'TODO', position: 1.5 },
      { status: 'TODO' },
      { position: 0 },
    ]) {
      await http(app)
        .patch(`/tasks/${task.id}/move`)
        .set(...asOwner)
        .send(body)
        .expect(400);
    }
  });

  it('mantém as posições densas sob movimentos concorrentes', async () => {
    const p = await freshProject();
    const tasks = [];
    for (let i = 0; i < 8; i += 1) {
      tasks.push(await createTask(app, owner, p.id, { title: `T${i}` }));
    }
    const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    await Promise.all(
      tasks.map((task, index) =>
        http(app)
          .patch(`/tasks/${task.id}/move`)
          .set(...bearer(owner.token))
          .send({ status: statuses[index % 3], position: index % 4 })
          .expect(200),
      ),
    );

    const final = await listTasks(app, owner, p.id);
    expect(final).toHaveLength(8);
    columns(final);
    expect(new Set(final.map((t) => t.id)).size).toBe(8);
  });

  it('exclui fechando a lacuna da coluna', async () => {
    const p = await freshProject();
    await createTask(app, owner, p.id, { title: 'Alfa' });
    const b = await createTask(app, owner, p.id, { title: 'Beta' });
    await createTask(app, owner, p.id, { title: 'Gama' });
    await createTask(app, owner, p.id, { title: 'Xis', status: 'DONE' });

    await http(app)
      .delete(`/tasks/${b.id}`)
      .set(...bearer(owner.token))
      .expect(204);
    expect(columns(await listTasks(app, owner, p.id))).toEqual({
      TODO: ['Alfa', 'Gama'],
      IN_PROGRESS: [],
      DONE: ['Xis'],
    });
    await http(app)
      .get(`/tasks/${b.id}`)
      .set(...bearer(owner.token))
      .expect(404);

    const next = await createTask(app, owner, p.id, { title: 'Delta' });
    expect(next.position).toBe(2);
  });

  it('só o dono do projeto ou quem criou a tarefa pode excluir', async () => {
    const p = await freshProject();
    const third = await registerUser(app, 'Terceiro');
    await http(app)
      .post(`/projects/${p.id}/members`)
      .set(...bearer(owner.token))
      .send({ userId: third.id })
      .expect(201);

    const byMember = await createTask(app, member, p.id, { title: 'Do membro' });
    const byOwner = await createTask(app, owner, p.id, { title: 'Da dona' });

    const forbidden = await http(app)
      .delete(`/tasks/${byMember.id}`)
      .set(...bearer(third.token))
      .expect(403);
    expect(forbidden.body.statusCode).toBe(403);
    await http(app)
      .delete(`/tasks/${byOwner.id}`)
      .set(...bearer(member.token))
      .expect(403);

    await http(app)
      .delete(`/tasks/${byMember.id}`)
      .set(...bearer(member.token))
      .expect(204);
    await http(app)
      .delete(`/tasks/${byOwner.id}`)
      .set(...bearer(owner.token))
      .expect(204);

    const another = await createTask(app, member, p.id, { title: 'Outra do membro' });
    await http(app)
      .delete(`/tasks/${another.id}`)
      .set(...bearer(owner.token))
      .expect(204);
  });

  it('lista as minhas tarefas por prazo (sem data por último), com filtro de status', async () => {
    const solo = await registerUser(app, 'Solo');
    const p = await createProject(app, solo, { name: 'Meu projeto' });
    await createTask(app, solo, p.id, { title: 'Sem data', assigneeId: solo.id });
    await createTask(app, solo, p.id, {
      title: 'Tarde',
      assigneeId: solo.id,
      dueDate: '2026-10-10',
    });
    await createTask(app, solo, p.id, {
      title: 'Cedo',
      assigneeId: solo.id,
      dueDate: '2026-02-01',
      status: 'DONE',
    });
    await createTask(app, solo, p.id, { title: 'De ninguém', dueDate: '2026-01-01' });

    const all = await http(app)
      .get('/me/tasks')
      .set(...bearer(solo.token))
      .expect(200);
    expect(all.body.map((t: TaskBody) => t.title)).toEqual(['Cedo', 'Tarde', 'Sem data']);
    expect(all.body[0].project).toEqual({ id: p.id, name: 'Meu projeto' });

    const done = await http(app)
      .get('/me/tasks?status=DONE')
      .set(...bearer(solo.token))
      .expect(200);
    expect(done.body.map((t: TaskBody) => t.title)).toEqual(['Cedo']);
    await http(app)
      .get('/me/tasks?status=NADA')
      .set(...bearer(solo.token))
      .expect(400);
  });
});
