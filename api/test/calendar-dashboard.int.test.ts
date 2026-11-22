import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addDays, todayInSaoPaulo } from '@/common/dates';
import {
  bearer,
  createProject,
  createTask,
  createTestApp,
  http,
  registerUser,
  type TestUser,
} from './helpers';

describe('calendário', () => {
  let app: NestExpressApplication;
  let user: TestUser;
  let stranger: TestUser;
  let project: { id: string };

  beforeAll(async () => {
    app = await createTestApp();
    user = await registerUser(app, 'Ana Agenda');
    stranger = await registerUser(app, 'Estranho');
    project = await createProject(app, user, {
      name: 'Festa; da vila, edição 1',
      startDate: '2026-04-01',
      dueDate: '2026-04-30',
    });
    await createTask(app, user, project.id, { title: 'Dentro', dueDate: '2026-04-10' });
    await createTask(app, user, project.id, { title: 'Na borda', dueDate: '2026-04-30' });
    await createTask(app, user, project.id, { title: 'Fora do intervalo', dueDate: '2026-08-01' });
    await createTask(app, user, project.id, { title: 'Sem prazo' });
    await createProject(app, stranger, { name: 'De outra pessoa', dueDate: '2026-04-15' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('devolve só os eventos do intervalo e dos meus projetos, ordenados por data, no formato do contrato', async () => {
    const response = await http(app)
      .get('/calendar?from=2026-04-01&to=2026-04-30')
      .set(...bearer(user.token))
      .expect(200);

    const events = response.body as Array<{ kind: string; date: string; task?: unknown }>;
    expect(events.map((event) => `${event.kind}:${event.date}`)).toEqual([
      'TASK:2026-04-10',
      'PROJECT_DEADLINE:2026-04-30',
      'TASK:2026-04-30',
    ]);
    expect(events[0]?.task).toMatchObject({
      title: 'Dentro',
      project: { id: project.id, name: 'Festa; da vila, edição 1' },
    });
    expect(events[1]).toEqual({
      kind: 'PROJECT_DEADLINE',
      date: '2026-04-30',
      project: { id: project.id, name: 'Festa; da vila, edição 1' },
    });
  });

  it('aceita exatamente 92 dias e recusa mais que isso', async () => {
    await http(app)
      .get('/calendar?from=2026-01-01&to=2026-04-03')
      .set(...bearer(user.token))
      .expect(200);
    const response = await http(app)
      .get('/calendar?from=2026-01-01&to=2026-04-04')
      .set(...bearer(user.token))
      .expect(400);
    expect(response.body.details[0].message).toBe('O intervalo máximo é de 92 dias');
  });

  it('valida os parâmetros', async () => {
    const asUser = bearer(user.token);
    await http(app)
      .get('/calendar')
      .set(...asUser)
      .expect(400);
    await http(app)
      .get('/calendar?from=2026-04-01')
      .set(...asUser)
      .expect(400);
    await http(app)
      .get('/calendar?from=2026-04-30&to=2026-04-01')
      .set(...asUser)
      .expect(400);
    await http(app)
      .get('/calendar?from=ontem&to=hoje')
      .set(...asUser)
      .expect(400);
    await http(app)
      .get('/calendar?from=2026-02-30&to=2026-03-10')
      .set(...asUser)
      .expect(400);
  });

  it('exporta /calendar.ics como arquivo iCalendar válido, sem limite de intervalo', async () => {
    const response = await http(app)
      .get('/calendar.ics')
      .set(...bearer(user.token))
      .expect(200);

    expect(response.headers['content-type']).toBe('text/calendar; charset=utf-8');
    expect(response.headers['content-disposition']).toBe('attachment; filename="tarefas.ics"');

    const text: string = response.text;
    expect(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(text).toContain('PRODID:');
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(text).toContain('DTSTART;VALUE=DATE:20260410\r\n');
    expect(text).toContain('DTEND;VALUE=DATE:20260411\r\n');
    expect(text).toContain('DTSTART;VALUE=DATE:20260801\r\n');
    expect(text).toContain(`UID:project-${project.id}@gerenciador-tarefas\r\n`);
    expect(text).toContain('Prazo do projeto: Festa\\; da vila\\, edição 1');
    expect(text).not.toContain('De outra pessoa');
    expect(text).not.toContain('Sem prazo');
  });
});

describe('painel', () => {
  let app: NestExpressApplication;
  let me: TestUser;
  let colleague: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
    me = await registerUser(app, 'Eu Mesmo');
    colleague = await registerUser(app, 'Colega');
  });

  afterAll(async () => {
    await app.close();
  });

  it('resume o painel com "hoje" no fuso de São Paulo', async () => {
    const today = todayInSaoPaulo();
    const first = await createProject(app, me, { name: 'Primeiro', memberIds: [colleague.id] });
    await createProject(app, me, { name: 'Segundo' });
    await createProject(app, colleague, { name: 'Do colega' });

    const mine = (title: string, dueDate: string | null, extra: Record<string, unknown> = {}) =>
      createTask(app, me, first.id, { title, dueDate, assigneeId: me.id, ...extra });

    await mine('Atrasada', addDays(today, -3));
    await mine('Atrasada em andamento', addDays(today, -1), { status: 'IN_PROGRESS' });
    await mine('Hoje', today);
    await mine('Em seis dias', addDays(today, 6));
    await mine('Em sete dias', addDays(today, 7));
    await mine('Mês que vem', addDays(today, 40));
    await mine('Sem prazo', null);
    await mine('Concluída atrasada', addDays(today, -10), { status: 'DONE' });
    await createTask(app, me, first.id, {
      title: 'Da colega',
      dueDate: addDays(today, 1),
      assigneeId: colleague.id,
    });

    const response = await http(app)
      .get('/dashboard/summary')
      .set(...bearer(me.token))
      .expect(200);
    expect(response.body).toMatchObject({
      projectCount: 2,
      openTaskCount: 7,
      overdueTaskCount: 2,
      dueThisWeekCount: 2,
    });
    expect(Object.keys(response.body).sort()).toEqual([
      'dueThisWeekCount',
      'openTaskCount',
      'overdueTaskCount',
      'projectCount',
      'upcoming',
    ]);

    const upcoming = response.body.upcoming as Array<{ title: string; project: { name: string } }>;
    expect(upcoming.map((task) => task.title)).toEqual([
      'Atrasada',
      'Atrasada em andamento',
      'Hoje',
      'Em seis dias',
      'Em sete dias',
      'Mês que vem',
    ]);
    expect(upcoming[0]?.project.name).toBe('Primeiro');
  });

  it('limita "upcoming" a 8 tarefas', async () => {
    const solo = await registerUser(app, 'Muitas Tarefas');
    const project = await createProject(app, solo);
    const today = todayInSaoPaulo();
    for (let i = 0; i < 10; i += 1) {
      await createTask(app, solo, project.id, {
        title: `T${i}`,
        dueDate: addDays(today, i),
        assigneeId: solo.id,
      });
    }
    const response = await http(app)
      .get('/dashboard/summary')
      .set(...bearer(solo.token))
      .expect(200);
    expect(response.body.upcoming).toHaveLength(8);
    expect(response.body.openTaskCount).toBe(10);
  });

  it('devolve zeros para quem não tem nada', async () => {
    const empty = await registerUser(app, 'Vazio');
    const response = await http(app)
      .get('/dashboard/summary')
      .set(...bearer(empty.token))
      .expect(200);
    expect(response.body).toEqual({
      projectCount: 0,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dueThisWeekCount: 0,
      upcoming: [],
    });
  });
});
