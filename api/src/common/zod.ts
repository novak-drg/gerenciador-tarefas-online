import { z } from 'zod';

const TYPE_NAMES: Record<string, string> = {
  string: 'texto',
  number: 'número',
  integer: 'número inteiro',
  boolean: 'verdadeiro ou falso',
  array: 'lista',
  object: 'objeto',
  date: 'data',
};

const portugueseErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') return { message: 'Campo obrigatório' };
      return {
        message: `Valor inválido: esperado ${TYPE_NAMES[issue.expected] ?? issue.expected}`,
      };
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string')
        return { message: `Deve ter pelo menos ${issue.minimum} caracteres` };
      if (issue.type === 'array')
        return { message: `Deve ter pelo menos ${issue.minimum} item(ns)` };
      return { message: `Deve ser maior ou igual a ${issue.minimum}` };
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string')
        return { message: `Deve ter no máximo ${issue.maximum} caracteres` };
      if (issue.type === 'array')
        return { message: `Deve ter no máximo ${issue.maximum} item(ns)` };
      return { message: `Deve ser menor ou igual a ${issue.maximum}` };
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'E-mail inválido' };
      if (issue.validation === 'uuid') return { message: 'Identificador inválido' };
      return { message: 'Formato inválido' };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `Valor inválido. Use um destes: ${issue.options.join(', ')}` };
    case z.ZodIssueCode.unrecognized_keys:
      return { message: `Campo(s) não permitido(s): ${issue.keys.join(', ')}` };
    case z.ZodIssueCode.invalid_date:
      return { message: 'Data inválida' };
    default:
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(portugueseErrorMap);

export { z };
