import { Injectable } from '@nestjs/common';
import type { ApiUser } from '@/common/contract';
import { userSelect } from '@/common/user-select';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

const MIN_SEARCH_LENGTH = 2;
const MAX_RESULTS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(term: string | undefined): Promise<ApiUser[]> {
    if (!term || term.length < MIN_SEARCH_LENGTH) return [];
    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: userSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: MAX_RESULTS,
    });
  }
}
