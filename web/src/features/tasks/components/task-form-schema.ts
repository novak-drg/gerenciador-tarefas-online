import { z } from 'zod';

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Informe o título da tarefa')
    .min(2, 'O título precisa ter ao menos 2 caracteres')
    .max(120, 'O título pode ter no máximo 120 caracteres'),
  description: z.string().trim().max(2000, 'A descrição pode ter no máximo 2000 caracteres'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  // empty string means "no due date"
  dueDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Informe uma data válida'),
  // empty string means "nobody"
  assigneeId: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const TASK_FORM_FIELDS = [
  'title',
  'description',
  'priority',
  'dueDate',
  'assigneeId',
  'status',
] as const satisfies readonly (keyof TaskFormValues)[];
