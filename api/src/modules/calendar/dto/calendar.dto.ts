import { createZodDto } from 'nestjs-zod';
import { daysBetween, isValidDateOnly } from '@/common/dates';
import { dateOnlySchema } from '@/common/dto';
import { z } from '@/common/zod';

export const MAX_RANGE_DAYS = 92;

export const calendarQuerySchema = z
  .object({ from: dateOnlySchema, to: dateOnlySchema })
  .strict()
  .superRefine((value, ctx) => {
    // Only compare once both dates are individually valid.
    if (!isValidDateOnly(value.from) || !isValidDateOnly(value.to)) return;
    const span = daysBetween(value.from, value.to);
    if (span < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'A data final deve ser igual ou posterior à data inicial',
      });
    } else if (span > MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: `O intervalo máximo é de ${MAX_RANGE_DAYS} dias`,
      });
    }
  });

export class CalendarQueryDto extends createZodDto(calendarQuerySchema) {}
