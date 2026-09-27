import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ActivityType,
  ConnectionStatus,
  IntegrationProvider,
  Prisma,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ComposioService } from '@/integrations/composio/services/composio.service';
import { ComposioAccountStatus } from '@/integrations/composio/interfaces/composio.interface';
import { IntegrationCatalog } from '@/shared/config/integrations';
import { ErrorCodes } from '@/shared/config/error-codes';
import { ActivitiesService } from '@/modules/activities/activities.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import {
  ActiveConnection,
  ConnectionView,
  IntegrationView,
} from './interfaces/integrations.interface';
import { GithubIntegrationService } from './services/github-integration.service';
import { LinearIntegrationService } from './services/linear-integration.service';

const connectionInclude = {
  user: { select: { id: true, full_name: true, email: true } },
} satisfies Prisma.IntegrationConnectionInclude;

type ConnectionWithUser = Prisma.IntegrationConnectionGetPayload<{
  include: typeof connectionInclude;
}>;

const STATUS_MAP: Record<string, ConnectionStatus> = {
  INITIALIZING: ConnectionStatus.INITIATED,
  INITIATED: ConnectionStatus.INITIATED,
  ACTIVE: ConnectionStatus.ACTIVE,
  FAILED: ConnectionStatus.FAILED,
  EXPIRED: ConnectionStatus.EXPIRED,
  INACTIVE: ConnectionStatus.DISCONNECTED,
};

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly composio: ComposioService,
    private readonly activitiesService: ActivitiesService,
    private readonly github: GithubIntegrationService,
    private readonly linear: LinearIntegrationService,
  ) {}

  async findCatalog(organizationId: string): Promise<IntegrationView[]> {
    const connections = await this.prisma.integrationConnection.findMany({
      where: {
        organization_id: organizationId,
        status: { not: ConnectionStatus.DISCONNECTED },
      },
      include: connectionInclude,
      orderBy: [{ is_default: 'desc' }, { created_at: 'asc' }],
    });
    const available = this.composio.isConfigured();

    return IntegrationCatalog.map((entry) => ({
      ...entry,
      available: available && entry.supported,
      connections: connections
        .filter((c) => c.provider === entry.provider)
        .map(this.toView),
    }));
  }

  async initiate(
    organizationId: string,
    userId: string,
    provider: IntegrationProvider,
    dto: CreateConnectionDto,
  ) {
    const entry = IntegrationCatalog.find((i) => i.provider === provider);
    if (!entry?.supported)
      throw new BadRequestException(
        `${entry?.name ?? provider} is not supported yet`,
      );

    const authConfigId = await this.composio.ensureAuthConfig(provider);
    const request = await this.composio.initiateConnection(
      authConfigId,
      this.composioUserId(organizationId, userId),
      this.config.get<string>('COMPOSIO_CALLBACK_URL'),
    );

    const existingCount = await this.prisma.integrationConnection.count({
      where: {
        organization_id: organizationId,
        provider,
        status: { not: ConnectionStatus.DISCONNECTED },
      },
    });

    const connection = await this.prisma.integrationConnection.create({
      data: {
        organization_id: organizationId,
        user_id: userId,
        provider,
        composio_account_id: request.id,
        composio_auth_config: authConfigId,
        label:
          dto.label?.trim() || `${entry.name} account ${existingCount + 1}`,
        status: this.mapStatus(request.status),
        is_default: existingCount === 0,
      },
      include: connectionInclude,
    });

    return {
      connection: this.toView(connection),
      redirect_url: request.redirect_url,
    };
  }

  async refresh(organizationId: string, id: string): Promise<ConnectionView> {
    const connection = await this.findOrThrow(organizationId, id);
    const account = await this.composio.getConnectedAccount(
      connection.composio_account_id,
    );
    const status = this.mapStatus(account.status);

    let externalAccount = connection.external_account;
    if (status === ConnectionStatus.ACTIVE && !externalAccount) {
      externalAccount = await this.resolveExternalAccount(connection).catch(
        (error) => {
          this.logger.warn(
            `Could not resolve account name for ${connection.provider}: ${error?.message}`,
          );
          return null;
        },
      );
    }

    const becameActive =
      status === ConnectionStatus.ACTIVE &&
      connection.status !== ConnectionStatus.ACTIVE;
    const updated = await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        status,
        external_account: externalAccount,
        last_error:
          status === ConnectionStatus.FAILED
            ? (account.status_reason ?? 'Connection failed')
            : null,
      },
      include: connectionInclude,
    });

    if (becameActive) {
      setImmediate(async () => {
        try {
          await this.activitiesService.record({
            organization_id: organizationId,
            user_id: connection.user_id,
            type: ActivityType.INTEGRATION_CONNECTED,
            message: `${this.providerName(connection.provider)} connected${externalAccount ? ` (${externalAccount})` : ''}`,
          });
        } catch {}
      });
    }

    return this.toView(updated);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateConnectionDto,
  ): Promise<ConnectionView> {
    const connection = await this.findOrThrow(organizationId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.is_default) {
        await tx.integrationConnection.updateMany({
          where: {
            organization_id: organizationId,
            provider: connection.provider,
            id: { not: id },
          },
          data: { is_default: false },
        });
      }
      return tx.integrationConnection.update({
        where: { id },
        data: { label: dto.label?.trim(), is_default: dto.is_default },
        include: connectionInclude,
      });
    });
    return this.toView(updated);
  }

  async remove(organizationId: string, userId: string, id: string) {
    const connection = await this.findOrThrow(organizationId, id);
    await this.composio.deleteConnectedAccount(connection.composio_account_id);

    await this.prisma.$transaction(async (tx) => {
      await tx.integrationConnection.delete({ where: { id } });
      if (connection.is_default) {
        const next = await tx.integrationConnection.findFirst({
          where: {
            organization_id: organizationId,
            provider: connection.provider,
            status: ConnectionStatus.ACTIVE,
          },
          orderBy: { created_at: 'asc' },
        });
        if (next)
          await tx.integrationConnection.update({
            where: { id: next.id },
            data: { is_default: true },
          });
      }
    });

    setImmediate(async () => {
      try {
        await this.activitiesService.record({
          organization_id: organizationId,
          user_id: userId,
          type: ActivityType.INTEGRATION_DISCONNECTED,
          message: `${this.providerName(connection.provider)} account “${connection.label}” disconnected`,
        });
      } catch {}
    });

    return { id };
  }

  /** Loads an ACTIVE connection of the given provider for a provider data call. */
  async getActiveConnection(
    organizationId: string,
    id: string,
    provider: IntegrationProvider,
  ): Promise<ActiveConnection> {
    const connection = await this.prisma.integrationConnection.findFirst({
      where: { id, organization_id: organizationId, provider },
    });
    if (!connection)
      throw new NotFoundException(
        `${this.providerName(provider)} connection not found`,
      );
    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new BadRequestException({
        message: `${this.providerName(provider)} connection “${connection.label}” is not active. Finish connecting it in Integrations.`,
        code: ErrorCodes.Integrations.CONNECTION_NOT_ACTIVE,
      });
    }
    return {
      id: connection.id,
      composio_account_id: connection.composio_account_id,
      composio_user_id: this.composioUserId(organizationId, connection.user_id),
    };
  }

  private async resolveExternalAccount(connection: ConnectionWithUser) {
    const active: ActiveConnection = {
      id: connection.id,
      composio_account_id: connection.composio_account_id,
      composio_user_id: this.composioUserId(
        connection.organization_id,
        connection.user_id,
      ),
    };
    if (connection.provider === IntegrationProvider.GITHUB)
      return this.github.getAccountName(active);
    if (connection.provider === IntegrationProvider.LINEAR)
      return this.linear.getAccountName(active);
    return null;
  }

  private async findOrThrow(organizationId: string, id: string) {
    const connection = await this.prisma.integrationConnection.findFirst({
      where: { id, organization_id: organizationId },
      include: connectionInclude,
    });
    if (!connection) throw new NotFoundException('Connection not found');
    return connection;
  }

  private composioUserId(organizationId: string, userId: string) {
    return `${organizationId}:${userId}`;
  }

  private mapStatus(status: ComposioAccountStatus): ConnectionStatus {
    return (
      STATUS_MAP[String(status).toUpperCase()] ?? ConnectionStatus.INITIATED
    );
  }

  private providerName(provider: IntegrationProvider) {
    return (
      IntegrationCatalog.find((i) => i.provider === provider)?.name ?? provider
    );
  }

  private toView = (connection: ConnectionWithUser): ConnectionView => ({
    id: connection.id,
    provider: connection.provider,
    label: connection.label,
    external_account: connection.external_account,
    status: connection.status,
    is_default: connection.is_default,
    last_error: connection.last_error,
    created_at: connection.created_at,
    user: connection.user,
  });
}
