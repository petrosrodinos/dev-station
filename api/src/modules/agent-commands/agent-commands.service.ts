import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgentType, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CreateAgentCommandDto } from './dto/create-agent-command.dto';
import { UpdateAgentCommandDto } from './dto/update-agent-command.dto';

@Injectable()
export class AgentCommandsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.agentCommand.findMany({
      where: { user_id: userId },
      orderBy: [{ agent_type: 'asc' }, { created_at: 'asc' }],
    });
  }

  create(userId: string, dto: CreateAgentCommandDto) {
    const { is_default, ...data } = dto;
    return this.withNameConflict(() =>
      this.prisma.$transaction(async (tx) => {
        if (is_default === true)
          await this.clearDefault(tx, userId, dto.agent_type);
        return tx.agentCommand.create({
          data: { ...data, user_id: userId, is_default: is_default === true },
        });
      }),
    );
  }

  async update(userId: string, id: string, dto: UpdateAgentCommandDto) {
    const existing = await this.getOwned(userId, id);
    const { is_default, ...data } = dto;
    const agentType = dto.agent_type ?? existing.agent_type;
    // Moving a default command to another agent type must not leave that type with two defaults.
    const isDefault =
      is_default ??
      (existing.is_default && agentType === existing.agent_type);

    return this.withNameConflict(() =>
      this.prisma.$transaction(async (tx) => {
        if (isDefault) await this.clearDefault(tx, userId, agentType, id);
        return tx.agentCommand.update({
          where: { id },
          data: { ...data, is_default: isDefault },
        });
      }),
    );
  }

  async remove(userId: string, id: string) {
    await this.getOwned(userId, id);
    await this.prisma.agentCommand.delete({ where: { id } });
    return { success: true };
  }

  private clearDefault(
    tx: Prisma.TransactionClient,
    userId: string,
    agentType: AgentType,
    exceptId?: string,
  ) {
    return tx.agentCommand.updateMany({
      where: {
        user_id: userId,
        agent_type: agentType,
        is_default: true,
        ...(exceptId && { id: { not: exceptId } }),
      },
      data: { is_default: false },
    });
  }

  private async getOwned(userId: string, id: string) {
    const command = await this.prisma.agentCommand.findFirst({
      where: { id, user_id: userId },
    });
    if (!command) throw new NotFoundException('Agent command not found');
    return command;
  }

  private async withNameConflict<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new ConflictException(
          'A command with this name already exists for this agent',
        );
      throw e;
    }
  }
}
