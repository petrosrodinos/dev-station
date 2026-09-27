import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientView } from './interfaces/client.interface';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string): Promise<ClientView[]> {
    const clients = await this.prisma.client.findMany({
      where: { organization_id: organizationId },
      include: { _count: { select: { projects: true } } },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    return clients.map(({ _count, updated_at, ...client }) => ({
      ...client,
      project_count: _count.projects,
    }));
  }

  async create(
    organizationId: string,
    dto: CreateClientDto,
  ): Promise<ClientView> {
    const name = dto.name.trim();
    const existing = await this.prisma.client.findFirst({
      where: { organization_id: organizationId, name },
    });
    if (existing)
      throw new ConflictException('A client with this name already exists');

    const client = await this.prisma.client.create({
      data: { organization_id: organizationId, name, color: dto.color },
    });
    return { ...client, project_count: 0 };
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateClientDto,
  ): Promise<ClientView> {
    await this.findOrThrow(organizationId, id);
    if (dto.name) {
      const clash = await this.prisma.client.findFirst({
        where: {
          organization_id: organizationId,
          name: dto.name.trim(),
          id: { not: id },
        },
      });
      if (clash)
        throw new ConflictException('A client with this name already exists');
    }

    await this.prisma.client.update({
      where: { id },
      data: { name: dto.name?.trim(), color: dto.color },
    });
    const clients = await this.findAll(organizationId);
    return clients.find((c) => c.id === id);
  }

  async remove(organizationId: string, id: string) {
    await this.findOrThrow(organizationId, id);
    await this.prisma.client.delete({ where: { id } });
    return { id };
  }

  private async findOrThrow(organizationId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, organization_id: organizationId },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }
}
