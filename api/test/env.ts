import { testDatabaseUrl } from './database-url';

process.env.DATABASE_URL = testDatabaseUrl();
process.env.JWT_SECRET = 'segredo-de-testes-de-integracao-com-mais-de-32-caracteres';
process.env.JWT_EXPIRES_IN = '1h';
// High limits so ordinary tests are never rate limited; rate-limit.int.test.ts lowers them itself.
process.env.THROTTLE_DEFAULT_LIMIT = '100000';
process.env.THROTTLE_AUTH_LIMIT = '100000';
