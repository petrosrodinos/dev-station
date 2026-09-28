import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CreateGitIdentityDto } from './dto/create-git-identity.dto';
import { UpdateGitIdentityDto } from './dto/update-git-identity.dto';

@Injectable()
export class GitIdentitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.gitIdentity.findMany({
      where: { user_id: userId },
      orderBy: [{ is_default: 'desc' }, { created_at: 'asc' }],
    });
  }

  create(userId: string, dto: CreateGitIdentityDto) {
    const { is_default, ...data } = dto;
    return this.withLabelConflict(() =>
      this.prisma.$transaction(async (tx) => {
        const count = await tx.gitIdentity.count({
          where: { user_id: userId },
        });
        const makeDefault = count === 0 || is_default === true;
        if (makeDefault)
          await tx.gitIdentity.updateMany({
            where: { user_id: userId, is_default: true },
            data: { is_default: false },
          });
        return tx.gitIdentity.create({
          data: { ...data, user_id: userId, is_default: makeDefault },
        });
      }),
    );
  }

  async update(userId: string, id: string, dto: UpdateGitIdentityDto) {
    const existing = await this.getOwned(userId, id);
    const { is_default, ...data } = dto;
    if (is_default === false && existing.is_default)
      throw new BadRequestException(
        'Pick another identity as the default instead.',
      );

    return this.withLabelConflict(() =>
      this.prisma.$transaction(async (tx) => {
        if (is_default === true)
          await tx.gitIdentity.updateMany({
            where: { user_id: userId, is_default: true },
            data: { is_default: false },
          });
        return tx.gitIdentity.update({
          where: { id },
          data: { ...data, ...(is_default === true && { is_default: true }) },
        });
      }),
    );
  }

  async remove(userId: string, id: string) {
    const existing = await this.getOwned(userId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.gitIdentity.delete({ where: { id } });
      if (!existing.is_default) return;
      const next = await tx.gitIdentity.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'asc' },
      });
      if (next)
        await tx.gitIdentity.update({
          where: { id: next.id },
          data: { is_default: true },
        });
    });
    return { success: true };
  }

  private async getOwned(userId: string, id: string) {
    const identity = await this.prisma.gitIdentity.findFirst({
      where: { id, user_id: userId },
    });
    if (!identity) throw new NotFoundException('Git identity not found');
    return identity;
  }

  private async withLabelConflict<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new ConflictException(
          'An identity with this label already exists',
        );
      throw e;
    }
  }
}
