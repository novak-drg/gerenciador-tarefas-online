/**
 * Local demo data. Wipes every user, project and task and recreates a small fictional scenario.
 * Never run it against a database that holds real data: it refuses non-local hosts on purpose.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { addDays, parseDateOnly, todayInSaoPaulo } from '../src/common/dates';
import { PrismaClient } from '../src/generated/prisma/client';
import type { TaskPriority, TaskStatus } from '../src/generated/prisma/client';
import { hashPassword } from '../src/modules/auth/password';

const DEMO_PASSWORD = 'demo12345';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

interface SeedTask {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Days from today; negative is overdue. */
  due?: number;
  assignee?: string;
  creator: string;
}

const envFile = path.join(process.cwd(), '.env');
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não definido. Copie .env.example para .env.');
  process.exit(1);
}
if (!LOCAL_HOSTS.has(new URL(databaseUrl).hostname)) {
  console.error('O seed apaga todos os dados e só roda em banco local. Abortando.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const today = todayInSaoPaulo();
const day = (offset: number): Date => parseDateOnly(addDays(today, offset));

const people = [
  { key: 'helena', name: 'Helena Martins', email: 'helena@demo.local' },
  { key: 'rafael', name: 'Rafael Costa', email: 'rafael@demo.local' },
  { key: 'beatriz', name: 'Beatriz Nogueira', email: 'beatriz@demo.local' },
  { key: 'lucas', name: 'Lucas Andrade', email: 'lucas@demo.local' },
] as const;

const portalTasks: SeedTask[] = [
  {
    title: 'Levantar os requisitos com o suporte',
    status: 'DONE',
    priority: 'HIGH',
    due: -12,
    assignee: 'helena',
    creator: 'helena',
  },
  {
    title: 'Desenhar o fluxo de abertura de chamado',
    description: 'Protótipo navegável validado com duas pessoas do suporte.',
    status: 'DONE',
    priority: 'HIGH',
    due: -6,
    assignee: 'rafael',
    creator: 'helena',
  },
  {
    title: 'Implementar a tela de login',
    description: 'Entrada por e-mail e senha, com recuperação de acesso.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    due: -2,
    assignee: 'helena',
    creator: 'helena',
  },
  {
    title: 'Criar a API de chamados',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    due: 4,
    assignee: 'lucas',
    creator: 'rafael',
  },
  {
    title: 'Escrever os textos de ajuda',
    status: 'TODO',
    priority: 'MEDIUM',
    due: 2,
    assignee: 'rafael',
    creator: 'beatriz',
  },
  {
    title: 'Revisar o fluxo de recuperação de senha',
    status: 'TODO',
    priority: 'MEDIUM',
    due: 2,
    assignee: 'helena',
    creator: 'rafael',
  },
  {
    title: 'Conferir os textos com o suporte',
    status: 'TODO',
    priority: 'LOW',
    due: 2,
    assignee: 'beatriz',
    creator: 'helena',
  },
  {
    title: 'Testar com um grupo de clientes',
    status: 'TODO',
    priority: 'LOW',
    due: 9,
    assignee: 'beatriz',
    creator: 'helena',
  },
  {
    title: 'Configurar o ambiente de produção',
    status: 'TODO',
    priority: 'HIGH',
    due: 20,
    creator: 'helena',
  },
  {
    title: 'Publicar a primeira versão',
    status: 'TODO',
    priority: 'LOW',
    due: 38,
    assignee: 'helena',
    creator: 'helena',
  },
];

const onboardingTasks: SeedTask[] = [
  {
    title: 'Listar os acessos necessários por função',
    status: 'DONE',
    priority: 'MEDIUM',
    due: -8,
    assignee: 'rafael',
    creator: 'rafael',
  },
  {
    title: 'Escrever o guia do primeiro dia',
    description: 'O que instalar, com quem falar e onde ficam os documentos da equipe.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    due: 3,
    assignee: 'rafael',
    creator: 'rafael',
  },
  {
    title: 'Gravar o vídeo de apresentação da empresa',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    due: 12,
    assignee: 'beatriz',
    creator: 'rafael',
  },
  {
    title: 'Montar o kit de boas-vindas',
    status: 'TODO',
    priority: 'LOW',
    due: 6,
    assignee: 'helena',
    creator: 'beatriz',
  },
  {
    title: 'Definir os padrinhos de cada área',
    status: 'TODO',
    priority: 'MEDIUM',
    due: 30,
    creator: 'rafael',
  },
  {
    title: 'Agendar a conversa de 30 dias',
    status: 'TODO',
    priority: 'MEDIUM',
    due: 45,
    assignee: 'helena',
    creator: 'rafael',
  },
];

async function main(): Promise<void> {
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users = new Map<string, string>();
  for (const person of people) {
    const created = await prisma.user.create({
      data: { name: person.name, email: person.email, passwordHash },
    });
    users.set(person.key, created.id);
  }
  const id = (key: string): string => {
    const value = users.get(key);
    if (!value) throw new Error(`Usuário de demonstração desconhecido: ${key}`);
    return value;
  };

  const projects = [
    {
      name: 'Portal de Atendimento ao Cliente',
      description: 'Portal para os clientes abrirem e acompanharem chamados de suporte.',
      start: -30,
      end: 45,
      owner: 'helena',
      members: ['rafael', 'beatriz', 'lucas'],
      tasks: portalTasks,
    },
    {
      name: 'Onboarding de Novos Colaboradores',
      description: 'Organizar o material e as etapas de entrada de quem chega à equipe.',
      start: -15,
      end: 60,
      owner: 'rafael',
      members: ['helena', 'beatriz'],
      tasks: onboardingTasks,
    },
  ];

  let taskTotal = 0;
  for (const spec of projects) {
    const project = await prisma.project.create({
      data: {
        name: spec.name,
        description: spec.description,
        startDate: day(spec.start),
        dueDate: day(spec.end),
        ownerId: id(spec.owner),
        members: {
          create: [
            { userId: id(spec.owner), role: 'OWNER' },
            ...spec.members.map((key) => ({ userId: id(key), role: 'MEMBER' as const })),
          ],
        },
      },
    });

    const nextPosition: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    for (const task of spec.tasks) {
      const position = nextPosition[task.status];
      nextPosition[task.status] += 1;
      await prisma.task.create({
        data: {
          projectId: project.id,
          title: task.title,
          description: task.description ?? null,
          status: task.status,
          priority: task.priority,
          position,
          dueDate: task.due === undefined ? null : day(task.due),
          assigneeId: task.assignee ? id(task.assignee) : null,
          createdById: id(task.creator),
          completedAt: task.status === 'DONE' ? new Date() : null,
        },
      });
      taskTotal += 1;
    }
  }

  console.log('Dados de demonstração criados (somente para uso local).');
  console.log(`${people.length} usuários, ${projects.length} projetos e ${taskTotal} tarefas.\n`);
  console.log('Logins de demonstração (senha de todos: %s):', DEMO_PASSWORD);
  for (const person of people) console.log(`  ${person.email}  (${person.name})`);
}

main()
  .catch((error: unknown) => {
    console.error('Falha ao criar os dados de demonstração:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
