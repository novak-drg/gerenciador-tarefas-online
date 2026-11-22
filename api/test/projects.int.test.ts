import { randomUUID } from 'node:crypto';
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

describe('projetos', () => {
  let app: NestExpressApplication;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
    owner = await registerUser(app, 'Dona do Projeto');
    member = await registerUser(app, 'Membro Comum');
    outsider = await registerUser(app, 'Pessoa de Fora');
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria um projeto: quem cria vira dono e membros extras entram como MEMBER', async () => {
    const response = await http(app)
      .post('/projects')
      .set(...bearer(owner.token))
      .send({
        name: '  Festa da vila ',
        description: 'Organização da festa',
        startDate: '2026-03-01',
        dueDate: '2026-03-31',
        memberIds: [member.id, member.id, owner.id],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Festa da vila',
      description: 'Organização da festa',
      startDate: '2026-03-01',
      dueDate: '2026-03-31',
      role: 'OWNER',
      memberCount: 2,
      taskCounts: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
    });
    expect(response.body.members.map((m: { role: string }) => m.role)).toEqual(['OWNER', 'MEMBER']);
    expect(response.body.members[0].user).toEqual({
      id: owner.id,
      name: owner.name,
      email: owner.email,
    });
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|argon2/);
  });

  it('mantém a data de calendário sem deslocamento de fuso', async () => {
    const project = await createProject(app, owner, {
      startDate: '2026-01-01',
      dueDate: '2026-12-31',
    });
    const fetched = await http(app)
      .get(`/projects/${project.id}`)
      .set(...bearer(owner.token))
      .expect(200);
    expect(fetched.body.startDate).toBe('2026-01-01');
    expect(fetched.body.dueDate).toBe('2026-12-31');
  });

  it('valida datas e tamanhos', async () => {
    const invalid = await http(app)
      .post('/projects')
      .set(...bearer(owner.token))
      .send({ name: 'Projeto', startDate: '2026-05-10', dueDate: '2026-05-01' })
      .expect(400);
    expect(invalid.body.details).toEqual([
      {
        path: 'dueDate',
        message: 'A data de término deve ser igual ou posterior à data de início',
      },
    ]);

    await http(app)
      .post('/projects')
      .set(...bearer(owner.token))
      .send({ name: 'P', startDate: '2026-05-01', dueDate: '2026-05-10' })
      .expect(400);
    await http(app)
      .post('/projects')
      .set(...bearer(owner.token))
      .send({
        name: 'Projeto',
        startDate: '2026-05-01',
        dueDate: '2026-05-10',
        ownerId: outsider.id,
      })
      .expect(400);
    await http(app)
      .post('/projects')
      .set(...bearer(owner.token))
      .send({
        name: 'Projeto',
        startDate: '2026-05-01',
        dueDate: '2026-05-10',
        memberIds: [randomUUID()],
      })
      .expect(400);
  });

  it('lista só os projetos de que participo, por prazo crescente, com papel e contagens', async () => {
    const solo = await registerUser(app, 'Solo');
    const later = await createProject(app, solo, { name: 'Depois', dueDate: '2027-06-30' });
    const sooner = await createProject(app, solo, { name: 'Antes', dueDate: '2027-02-01' });
    await createProject(app, owner, { name: 'Alheio' });
    await createTask(app, solo, sooner.id, { title: 'Tarefa 1' });
    await createTask(app, solo, sooner.id, { title: 'Tarefa 2', status: 'DONE' });

    const response = await http(app)
      .get('/projects')
      .set(...bearer(solo.token))
      .expect(200);
    expect(response.body.map((p: { id: string }) => p.id)).toEqual([sooner.id, later.id]);
    expect(response.body[0]).toMatchObject({
      role: 'OWNER',
      memberCount: 1,
      taskCounts: { TODO: 1, IN_PROGRESS: 0, DONE: 1 },
    });
    expect(response.body[0].members).toBeUndefined();
  });

  it('trata não membro como 404 e id malformado como 400', async () => {
    const project = await createProject(app, owner);
    for (const [method, path] of [
      ['get', `/projects/${project.id}`],
      ['patch', `/projects/${project.id}`],
      ['delete', `/projects/${project.id}`],
      ['get', `/projects/${project.id}/tasks`],
    ] as const) {
      const response = await route(app, method, path)
        .set(...bearer(outsider.token))
        .send({})
        .expect(404);
      expect(response.body.message).toBe('Projeto não encontrado');
    }
    await http(app)
      .get(`/projects/${randomUUID()}`)
      .set(...bearer(owner.token))
      .expect(404);
    await http(app)
      .get('/projects/abc')
      .set(...bearer(owner.token))
      .expect(400);
  });

  it('permite só ao dono editar, excluir e gerir membros (403 para membro comum)', async () => {
    const project = await createProject(app, owner, { memberIds: [member.id] });
    const asMember = bearer(member.token);

    const patch = await http(app)
      .patch(`/projects/${project.id}`)
      .set(...asMember)
      .send({ name: 'Novo nome' })
      .expect(403);
    expect(patch.body.statusCode).toBe(403);
    await http(app)
      .delete(`/projects/${project.id}`)
      .set(...asMember)
      .expect(403);
    await http(app)
      .post(`/projects/${project.id}/members`)
      .set(...asMember)
      .send({ userId: outsider.id })
      .expect(403);
    await http(app)
      .delete(`/projects/${project.id}/members/${member.id}`)
      .set(...asMember)
      .expect(403);

    await http(app)
      .get(`/projects/${project.id}`)
      .set(...asMember)
      .expect(200);
  });

  it('atualiza parcialmente, limpa a descrição e confere as datas contra o valor atual', async () => {
    const project = await createProject(app, owner, {
      description: 'texto',
      startDate: '2026-06-10',
      dueDate: '2026-06-20',
    });
    const updated = await http(app)
      .patch(`/projects/${project.id}`)
      .set(...bearer(owner.token))
      .send({ name: 'Renomeado', description: null })
      .expect(200);
    expect(updated.body).toMatchObject({
      name: 'Renomeado',
      description: null,
      dueDate: '2026-06-20',
    });

    const conflict = await http(app)
      .patch(`/projects/${project.id}`)
      .set(...bearer(owner.token))
      .send({ dueDate: '2026-06-01' })
      .expect(400);
    expect(conflict.body.message).toBe(
      'A data de término deve ser igual ou posterior à data de início',
    );
  });

  it('exclui o projeto junto com tarefas e vínculos', async () => {
    const project = await createProject(app, owner, { memberIds: [member.id] });
    const task = await createTask(app, owner, project.id, { title: 'Tarefa' });

    await http(app)
      .delete(`/projects/${project.id}`)
      .set(...bearer(owner.token))
      .expect(204);
    await http(app)
      .get(`/projects/${project.id}`)
      .set(...bearer(owner.token))
      .expect(404);
    await http(app)
      .get(`/tasks/${task.id}`)
      .set(...bearer(owner.token))
      .expect(404);
    const listed = await http(app)
      .get('/projects')
      .set(...bearer(member.token))
      .expect(200);
    expect(listed.body.map((p: { id: string }) => p.id)).not.toContain(project.id);
  });

  it('adiciona e remove membros, com 409 e 404 nos casos de borda', async () => {
    const project = await createProject(app, owner);
    const added = await http(app)
      .post(`/projects/${project.id}/members`)
      .set(...bearer(owner.token))
      .send({ userId: member.id })
      .expect(201);
    expect(added.body).toEqual({
      user: { id: member.id, name: member.name, email: member.email },
      role: 'MEMBER',
      addedAt: expect.any(String),
    });

    await http(app)
      .post(`/projects/${project.id}/members`)
      .set(...bearer(owner.token))
      .send({ userId: member.id })
      .expect(409);
    await http(app)
      .post(`/projects/${project.id}/members`)
      .set(...bearer(owner.token))
      .send({ userId: randomUUID() })
      .expect(400);

    await http(app)
      .get(`/projects/${project.id}`)
      .set(...bearer(member.token))
      .expect(200);
    await http(app)
      .delete(`/projects/${project.id}/members/${member.id}`)
      .set(...bearer(owner.token))
      .expect(204);
    await http(app)
      .get(`/projects/${project.id}`)
      .set(...bearer(member.token))
      .expect(404);
    await http(app)
      .delete(`/projects/${project.id}/members/${member.id}`)
      .set(...bearer(owner.token))
      .expect(404);
  });

  it('não deixa remover o dono (409)', async () => {
    const project = await createProject(app, owner);
    const response = await http(app)
      .delete(`/projects/${project.id}/members/${owner.id}`)
      .set(...bearer(owner.token))
      .expect(409);
    expect(response.body.message).toBe('O dono do projeto não pode ser removido');
  });

  it('ao remover um membro, as tarefas dele no projeto ficam sem responsável', async () => {
    const project = await createProject(app, owner, { memberIds: [member.id] });
    const otherProject = await createProject(app, owner, { memberIds: [member.id] });
    const assigned = await createTask(app, owner, project.id, {
      title: 'Dele',
      assigneeId: member.id,
    });
    const ownerTask = await createTask(app, owner, project.id, {
      title: 'Minha',
      assigneeId: owner.id,
    });
    const elsewhere = await createTask(app, owner, otherProject.id, {
      title: 'Outro projeto',
      assigneeId: member.id,
    });

    await http(app)
      .delete(`/projects/${project.id}/members/${member.id}`)
      .set(...bearer(owner.token))
      .expect(204);

    const tasks = await http(app)
      .get(`/projects/${project.id}/tasks`)
      .set(...bearer(owner.token))
      .expect(200);
    const byId = new Map(tasks.body.map((t: { id: string }) => [t.id, t]));
    expect((byId.get(assigned.id) as { assignee: unknown }).assignee).toBeNull();
    expect((byId.get(ownerTask.id) as { assignee: { id: string } }).assignee.id).toBe(owner.id);

    const untouched = await http(app)
      .get(`/tasks/${elsewhere.id}`)
      .set(...bearer(owner.token))
      .expect(200);
    expect(untouched.body.assignee.id).toBe(member.id);
  });
});

describe('busca de usuários', () => {
  let app: NestExpressApplication;
  let searcher: TestUser;
  const marker = `zq${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    app = await createTestApp();
    searcher = await registerUser(app, `${marker} Buscador`);
    for (let i = 0; i < 12; i += 1) await registerUser(app, `${marker} Pessoa ${i}`);
  });

  afterAll(async () => {
    await app.close();
  });

  it('devolve no máximo 10 usuários, só com id, name e email', async () => {
    const response = await http(app)
      .get(`/users?search=${marker.toUpperCase()}`)
      .set(...bearer(searcher.token))
      .expect(200);
    expect(response.body).toHaveLength(10);
    for (const user of response.body) {
      expect(Object.keys(user).sort()).toEqual(['email', 'id', 'name']);
    }
  });

  it('busca também por e-mail, sem diferenciar maiúsculas', async () => {
    const response = await http(app)
      .get(`/users?search=${encodeURIComponent(searcher.email.toUpperCase())}`)
      .set(...bearer(searcher.token))
      .expect(200);
    expect(response.body).toEqual([
      { id: searcher.id, name: searcher.name, email: searcher.email },
    ]);
  });

  it('devolve lista vazia com menos de 2 caracteres ou sem busca', async () => {
    for (const path of ['/users?search=a', '/users?search=', '/users', '/users?search=%20x%20']) {
      const response = await http(app)
        .get(path)
        .set(...bearer(searcher.token))
        .expect(200);
      expect(response.body).toEqual([]);
    }
  });

  it('trata curingas e aspas como texto comum', async () => {
    const response = await http(app)
      .get(`/users?search=${encodeURIComponent("'; DROP TABLE users;--")}`)
      .set(...bearer(searcher.token))
      .expect(200);
    expect(response.body).toEqual([]);
  });
});
