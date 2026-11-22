import type { TaskPriority, TaskStatus } from './api/types';

/** Column order, same as the API's ordering by status */
export const STATUS_ORDER: readonly TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluído',
};

export const PRIORITY_ORDER: readonly TaskPriority[] = ['HIGH', 'MEDIUM', 'LOW'];

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};
