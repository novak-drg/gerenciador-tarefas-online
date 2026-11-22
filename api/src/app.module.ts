import { type ExecutionContext, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuthGuard } from '@/common/auth.guard';
import { AUTH_RATE_LIMIT_KEY } from '@/common/decorators';
import { AllExceptionsFilter } from '@/common/exception.filter';
import type { Env } from '@/config/env';
import { ENV, EnvModule } from '@/config/env.module';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CalendarModule } from '@/modules/calendar/calendar.module';
import { DashboardModule } from '@/modules/dashboard/dashboard.module';
import { HealthModule } from '@/modules/health/health.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { UsersModule } from '@/modules/users/users.module';

const ONE_MINUTE_MS = 60_000;

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        errorMessage: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
        throttlers: [
          { name: 'default', ttl: ONE_MINUTE_MS, limit: env.THROTTLE_DEFAULT_LIMIT },
          {
            // Applies only to routes marked with @AuthRateLimit().
            name: 'auth',
            ttl: ONE_MINUTE_MS,
            limit: env.THROTTLE_AUTH_LIMIT,
            skipIf: (context: ExecutionContext) =>
              !Reflect.getMetadata(AUTH_RATE_LIMIT_KEY, context.getHandler()),
          },
        ],
      }),
    }),
    AuthModule,
    HealthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    CalendarModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
