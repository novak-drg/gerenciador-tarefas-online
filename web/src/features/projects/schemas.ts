import { z } from 'zod';

export const projectFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome precisa ter ao menos 2 caracteres')
      .max(80, 'O nome pode ter no máximo 80 caracteres'),
    description: z.string().trim().max(500, 'A descrição pode ter no máximo 500 caracteres'),
    startDate: z.string().min(1, 'Informe a data de início'),
    dueDate: z.string().min(1, 'Informe o prazo'),
  })
  .refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, {
    path: ['dueDate'],
    message: 'O prazo não pode ser anterior ao início',
  });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
