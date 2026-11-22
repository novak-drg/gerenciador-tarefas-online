import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { Prisma } from '@/generated/prisma/client';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: { path: string; message: string }[];
}

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

const DEFAULT_MESSAGE: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Sem permissão para realizar esta ação',
  404: 'Recurso não encontrado',
  409: 'Conflito com o estado atual do recurso',
  413: 'Corpo da requisição grande demais',
  429: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
  500: 'Erro interno',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      const details =
        zodError instanceof ZodError
          ? zodError.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
          : [];
      return build(400, 'Dados inválidos', details);
    }

    if (exception instanceof HttpException) {
      return build(exception.getStatus(), messageOf(exception));
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        const target = JSON.stringify(exception.meta ?? {});
        return build(
          409,
          target.includes('email') ? 'Este e-mail já está cadastrado' : 'Registro já existente',
        );
      }
      if (exception.code === 'P2025') return build(404, 'Registro não encontrado');
    }

    const httpError = asBodyParserError(exception);
    if (httpError) return build(httpError, DEFAULT_MESSAGE[httpError] ?? 'Requisição inválida');

    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
    );
    return build(500, DEFAULT_MESSAGE[500] ?? 'Erro interno');
  }
}

function build(statusCode: number, message: string, details?: ErrorBody['details']): ErrorBody {
  const body: ErrorBody = {
    statusCode,
    error: STATUS_TEXT[statusCode] ?? 'Error',
    message,
  };
  if (details) body.details = details;
  return body;
}

/** Messages written by the application are already in Portuguese; framework defaults are replaced. */
function messageOf(exception: HttpException): string {
  const status = exception.getStatus();
  const response = exception.getResponse();
  const raw =
    typeof response === 'string'
      ? response
      : typeof response === 'object' &&
          'message' in response &&
          typeof response.message === 'string'
        ? response.message
        : undefined;
  if (raw?.startsWith('Cannot ')) return 'Rota não encontrada';
  if (!raw || raw === STATUS_TEXT[status]) return DEFAULT_MESSAGE[status] ?? 'Requisição inválida';
  return raw;
}

/** Errors thrown by the body parser (malformed JSON, payload too large) carry an HTTP status of their own. */
function asBodyParserError(exception: unknown): number | null {
  if (typeof exception !== 'object' || exception === null) return null;
  const status = (exception as { status?: unknown }).status;
  const type = (exception as { type?: unknown }).type;
  if (typeof status === 'number' && typeof type === 'string' && type.startsWith('entity.')) {
    return status;
  }
  return null;
}
