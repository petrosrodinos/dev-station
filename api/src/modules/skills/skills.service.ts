import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SkillFavoriteKind } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { FavoriteSkillDto } from './dto/favorite-skill.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string, userId: string) {
    return this.prisma.skill.findMany({
      where: {
        organization_id: organizationId,
        OR: [{ is_public: true }, { created_by: userId }],
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, userId: string, id: string) {
    return this.findOrThrow(organizationId, userId, id);
  }

  create(organizationId: string, userId: string, dto: CreateSkillDto) {
    return this.prisma.skill.create({
      data: {
        organization_id: organizationId,
        created_by: userId,
        name: dto.name.trim(),
        description: dto.description,
        body: dto.body,
        provider: dto.provider,
        kind: dto.kind,
        is_public: dto.is_public ?? true,
      },
    });
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    dto: UpdateSkillDto,
  ) {
    await this.findOrThrow(organizationId, userId, id);
    return this.prisma.skill.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description,
        body: dto.body,
        provider: dto.provider,
        kind: dto.kind,
        is_public: dto.is_public,
      },
    });
  }

  async remove(organizationId: string, userId: string, id: string) {
    await this.findOrThrow(organizationId, userId, id);
    await this.prisma.$transaction([
      this.prisma.skillFavorite.deleteMany({
        where: {
          organization_id: organizationId,
          target_kind: SkillFavoriteKind.CUSTOM,
          ref_id: id,
        },
      }),
      this.prisma.skill.delete({ where: { id } }),
    ]);
    return { id };
  }

  findFavorites(organizationId: string, userId: string) {
    return this.prisma.skillFavorite.findMany({
      where: { organization_id: organizationId, user_id: userId },
    });
  }

  async addFavorite(
    organizationId: string,
    userId: string,
    dto: FavoriteSkillDto,
  ) {
    if (dto.target_kind === SkillFavoriteKind.CUSTOM) {
      await this.findOrThrow(organizationId, userId, dto.ref_id);
    }

    try {
      return await this.prisma.skillFavorite.create({
        data: {
          organization_id: organizationId,
          user_id: userId,
          target_kind: dto.target_kind,
          ref_id: dto.ref_id,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Already favorited');
      }
      throw error;
    }
  }

  async removeFavorite(organizationId: string, userId: string, id: string) {
    const favorite = await this.prisma.skillFavorite.findFirst({
      where: { id, organization_id: organizationId, user_id: userId },
    });
    if (!favorite) throw new NotFoundException('Favorite not found');
    await this.prisma.skillFavorite.delete({ where: { id } });
    return { id };
  }

  /** Visible when public, or private and owned by the caller — never leaks another member's private skill. */
  private async findOrThrow(organizationId: string, userId: string, id: string) {
    const skill = await this.prisma.skill.findFirst({
      where: {
        id,
        organization_id: organizationId,
        OR: [{ is_public: true }, { created_by: userId }],
      },
    });
    if (!skill) throw new NotFoundException('Skill not found');
    return skill;
  }
}
