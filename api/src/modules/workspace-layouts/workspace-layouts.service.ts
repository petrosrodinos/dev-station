import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CreateLayoutDto } from './dto/create-layout.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';
import { UpdateLayoutStateDto } from './dto/update-layout-state.dto';
import {
  CURRENT_LAYOUT_VERSION,
  DEFAULT_LAYOUT_PRESET_NAME,
} from './constants/workspace-layouts.constants';
import {
  assertValidFloating,
  assertValidLayout,
  resolvePresetByProject,
} from './utils/workspace-layouts.utils';

@Injectable()
export class WorkspaceLayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The Default preset always exists — seeded empty on first touch, filled in by the client's first save. */
  private async ensureDefaultPreset(userId: string) {
    const existing = await this.prisma.workspaceLayoutPreset.findFirst({
      where: { user_id: userId, is_default: true },
    });
    if (existing) return existing;
    return this.prisma.workspaceLayoutPreset.create({
      data: {
        user_id: userId,
        name: DEFAULT_LAYOUT_PRESET_NAME,
        is_default: true,
        layout_version: CURRENT_LAYOUT_VERSION,
        layout: {},
        floating: [],
      },
    });
  }

  async findAll(userId: string) {
    await this.ensureDefaultPreset(userId);
    return this.prisma.workspaceLayoutPreset.findMany({
      where: { user_id: userId },
      orderBy: [{ is_default: 'desc' }, { created_at: 'asc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const preset = await this.prisma.workspaceLayoutPreset.findUnique({
      where: { id },
    });
    if (!preset || preset.user_id !== userId) {
      throw new NotFoundException('Layout preset not found');
    }
    return preset;
  }

  async create(userId: string, dto: CreateLayoutDto) {
    const layout = assertValidLayout(dto.layout);
    const floating = dto.floating ? assertValidFloating(dto.floating) : [];
    try {
      return await this.prisma.workspaceLayoutPreset.create({
        data: {
          user_id: userId,
          name: dto.name,
          layout_version: CURRENT_LAYOUT_VERSION,
          layout: layout as Prisma.InputJsonValue,
          floating: floating as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `A layout preset named "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdateLayoutDto) {
    await this.findOne(userId, id);
    const data: Prisma.WorkspaceLayoutPresetUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.layout !== undefined) {
      data.layout = assertValidLayout(dto.layout) as Prisma.InputJsonValue;
      data.layout_version = CURRENT_LAYOUT_VERSION;
    }
    if (dto.floating !== undefined) {
      data.floating = assertValidFloating(
        dto.floating,
      ) as Prisma.InputJsonValue;
    }
    try {
      return await this.prisma.workspaceLayoutPreset.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `A layout preset named "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async remove(userId: string, id: string) {
    const preset = await this.findOne(userId, id);
    if (preset.is_default) {
      throw new ForbiddenException('The default layout cannot be deleted');
    }

    const state = await this.prisma.workspaceLayoutState.findUnique({
      where: { user_id: userId },
    });
    const remainingProjectMap = state
      ? Object.fromEntries(
          Object.entries(
            resolvePresetByProject(state.preset_by_project),
          ).filter(([, presetId]) => presetId !== id),
        )
      : undefined;

    await this.prisma.$transaction([
      this.prisma.workspaceLayoutPreset.delete({ where: { id } }),
      ...(state
        ? [
            this.prisma.workspaceLayoutState.update({
              where: { user_id: userId },
              data: {
                preset_by_project: remainingProjectMap as Prisma.InputJsonValue,
                ...(state.active_preset_id === id
                  ? { active_preset_id: null }
                  : {}),
              },
            }),
          ]
        : []),
    ]);

    return { message: 'Layout preset deleted' };
  }

  async getState(userId: string) {
    const defaultPreset = await this.ensureDefaultPreset(userId);
    const state = await this.prisma.workspaceLayoutState.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId, active_preset_id: defaultPreset.id },
    });
    return {
      ...state,
      preset_by_project: resolvePresetByProject(state.preset_by_project),
    };
  }

  async updateState(userId: string, dto: UpdateLayoutStateDto) {
    if (dto.active_preset_id) await this.findOne(userId, dto.active_preset_id);
    if (dto.preset_id) await this.findOne(userId, dto.preset_id);
    if (
      (dto.project_id && !dto.preset_id) ||
      (!dto.project_id && dto.preset_id)
    ) {
      throw new BadRequestException(
        'project_id and preset_id must be provided together',
      );
    }

    const current = await this.getState(userId);
    const nextProjectMap = { ...current.preset_by_project };
    if (dto.project_id && dto.preset_id)
      nextProjectMap[dto.project_id] = dto.preset_id;

    const state = await this.prisma.workspaceLayoutState.update({
      where: { user_id: userId },
      data: {
        ...(dto.active_preset_id
          ? { active_preset_id: dto.active_preset_id }
          : {}),
        preset_by_project: nextProjectMap as Prisma.InputJsonValue,
      },
    });
    return {
      ...state,
      preset_by_project: resolvePresetByProject(state.preset_by_project),
    };
  }
}
