import { describe, expect, it } from 'vitest';
import { registerSchema } from '@/modules/auth/dto/auth.dto';
import { calendarQuerySchema } from '@/modules/calendar/dto/calendar.dto';
import { createProjectSchema, updateProjectSchema } from '@/modules/projects/dto/projects.dto';
import { createTaskSchema, moveTaskSchema, updateTaskSchema } from '@/modules/tasks/dto/tasks.dto';
import { JWT_SECRET_PLACEHOLDER, parseEnv } from '@/config/env';

const project = { name: 'Festa da vila', startDate: '2026-12-01', dueDate: '2026-12-31' };

describe('project schemas', () => {
  it('accepts a valid project', () => {
    expect(createProjectSchema.safeParse(project).success).toBe(true);
  });

  it('rejects a due date before the start date with a Portuguese message', () => {
    const result = createProjectSchema.safeParse({ ...project, dueDate: '2026-11-30' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['dueDate']);
      expect(result.error.issues[0]?.message).toBe(
        'A data de término deve ser igual ou posterior à data de início',
      );
    }
  });

  it('accepts a project that starts and ends on the same day', () => {
    expect(createProjectSchema.safeParse({ ...project, dueDate: project.startDate }).success).toBe(
      true,
    );
  });

  it('rejects unknown fields such as ownerId', () => {
    const result = createProjectSchema.safeParse({ ...project, ownerId: crypto.randomUUID() });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toContain('ownerId');
  });

  it('rejects impossible calendar dates and long descriptions', () => {
    expect(createProjectSchema.safeParse({ ...project, startDate: '2026-02-30' }).success).toBe(
      false,
    );
    expect(
      createProjectSchema.safeParse({ ...project, description: 'x'.repeat(501) }).success,
    ).toBe(false);
  });

  it('checks the order on partial updates only when both dates are present', () => {
    expect(updateProjectSchema.safeParse({ dueDate: '2020-01-01' }).success).toBe(true);
    expect(
      updateProjectSchema.safeParse({ startDate: '2026-05-02', dueDate: '2026-05-01' }).success,
    ).toBe(false);
  });
});

describe('task schemas', () => {
  it('does not let PATCH change status, position or ownership', () => {
    for (const forbidden of [{ status: 'DONE' }, { position: 0 }, { createdById: 'x' }]) {
      expect(updateTaskSchema.safeParse({ title: 'Nova', ...forbidden }).success).toBe(false);
    }
  });

  it('allows clearing dueDate and assigneeId with null', () => {
    expect(updateTaskSchema.safeParse({ dueDate: null, assigneeId: null }).success).toBe(true);
  });

  it('applies the title and enum rules', () => {
    expect(createTaskSchema.safeParse({ title: 'a' }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: 'Ok', priority: 'URGENT' }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: 'Ok', status: 'DONE' }).success).toBe(true);
  });

  it('requires an integer position when moving', () => {
    expect(moveTaskSchema.safeParse({ status: 'DONE', position: 1.5 }).success).toBe(false);
    expect(moveTaskSchema.safeParse({ status: 'DONE', position: 3 }).success).toBe(true);
    expect(moveTaskSchema.safeParse({ status: 'DONE' }).success).toBe(false);
  });
});

describe('auth schemas', () => {
  it('trims and lowercases the e-mail', () => {
    const result = registerSchema.parse({
      name: 'Ana Souza',
      email: '  Ana@Exemplo.COM ',
      password: 'senha1234',
    });
    expect(result.email).toBe('ana@exemplo.com');
  });

  it('enforces the password bounds of 8 to 72 characters', () => {
    const base = { name: 'Ana Souza', email: 'ana@exemplo.com' };
    expect(registerSchema.safeParse({ ...base, password: '1234567' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'x'.repeat(72) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, password: 'x'.repeat(73) }).success).toBe(false);
  });
});

describe('calendar query', () => {
  it('accepts up to 92 days and rejects more', () => {
    expect(calendarQuerySchema.safeParse({ from: '2026-01-01', to: '2026-04-03' }).success).toBe(
      true,
    );
    expect(calendarQuerySchema.safeParse({ from: '2026-01-01', to: '2026-04-04' }).success).toBe(
      false,
    );
  });

  it('rejects an inverted range', () => {
    expect(calendarQuerySchema.safeParse({ from: '2026-02-01', to: '2026-01-01' }).success).toBe(
      false,
    );
  });
});

describe('environment', () => {
  const valid = {
    DATABASE_URL: 'postgresql://u:p@127.0.0.1:5440/db',
    JWT_SECRET: 'x'.repeat(32),
  };

  it('applies defaults', () => {
    const env = parseEnv(valid);
    expect(env.PORT).toBe(3333);
    expect(env.HOST).toBe('127.0.0.1');
    expect(env.JWT_EXPIRES_IN).toBe('8h');
  });

  it('refuses a short JWT secret with a clear message', () => {
    expect(() => parseEnv({ ...valid, JWT_SECRET: 'curto' })).toThrow(/JWT_SECRET/);
    expect(() => parseEnv({ ...valid, JWT_SECRET: JWT_SECRET_PLACEHOLDER })).toThrow(
      /valor de exemplo/,
    );
  });

  it('refuses a missing DATABASE_URL', () => {
    expect(() => parseEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });
});
