import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { IntegrationProvider } from 'generated/prisma';
import { ErrorCodes } from '@/shared/config/error-codes';
import {
  ComposioAuthConfigEnv,
  ComposioConfig,
  ComposioToolkits,
} from '../config/composio.config';
import {
  ComposioConnectedAccount,
  ComposioConnectionRequest,
  ComposioToolResult,
  ExecuteToolInput,
} from '../interfaces/composio.interface';

/**
 * Thin wrapper around the Composio v3.1 REST API. OAuth tokens never leave Composio;
 * we only keep connected-account ids.
 */
@Injectable()
export class ComposioService {
  private readonly logger = new Logger(ComposioService.name);
  private readonly client: AxiosInstance | null;
  private readonly authConfigCache = new Map<IntegrationProvider, string>();

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('COMPOSIO_API_KEY');
    this.client = apiKey
      ? axios.create({
          baseURL: ComposioConfig.base_url,
          timeout: ComposioConfig.timeout_ms,
          headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        })
      : null;
    if (!apiKey)
      this.logger.warn(
        'COMPOSIO_API_KEY is not set — integrations are disabled',
      );
  }

  isConfigured() {
    return this.client !== null;
  }

  async ensureAuthConfig(provider: IntegrationProvider): Promise<string> {
    const cached = this.authConfigCache.get(provider);
    if (cached) return cached;

    const envKey = ComposioAuthConfigEnv[provider];
    const fromEnv = envKey ? this.config.get<string>(envKey) : undefined;
    if (fromEnv) {
      this.authConfigCache.set(provider, fromEnv);
      return fromEnv;
    }

    const toolkit = ComposioToolkits[provider];
    const existing = await this.request<{
      items?: { id: string; status?: string }[];
    }>('get', '/auth_configs', undefined, {
      toolkit_slug: toolkit,
    });
    const usable = existing.items?.find(
      (item) => !item.status || item.status === 'ENABLED',
    );

    const id =
      usable?.id ??
      (
        await this.request<{ auth_config: { id: string } }>(
          'post',
          '/auth_configs',
          {
            toolkit: { slug: toolkit },
            auth_config: { type: 'use_composio_managed_auth' },
          },
        )
      ).auth_config.id;

    this.authConfigCache.set(provider, id);
    return id;
  }

  async initiateConnection(
    authConfigId: string,
    userId: string,
    callbackUrl?: string,
  ): Promise<ComposioConnectionRequest> {
    const response = await this.request<
      ComposioConnectionRequest & { redirect_uri?: string | null }
    >('post', '/connected_accounts', {
      auth_config: { id: authConfigId },
      connection: {
        user_id: userId,
        ...(callbackUrl && { callback_url: callbackUrl }),
      },
    });
    return {
      id: response.id,
      status: response.status,
      redirect_url: response.redirect_url ?? response.redirect_uri ?? null,
    };
  }

  getConnectedAccount(id: string) {
    return this.request<ComposioConnectedAccount>(
      'get',
      `/connected_accounts/${encodeURIComponent(id)}`,
    );
  }

  async deleteConnectedAccount(id: string) {
    try {
      await this.request(
        'delete',
        `/connected_accounts/${encodeURIComponent(id)}`,
      );
    } catch (error) {
      // Already gone at Composio — local cleanup can proceed.
      if (
        !(
          error instanceof BadGatewayException &&
          /not found/i.test(error.message)
        )
      )
        throw error;
    }
  }

  async executeTool<T = unknown>(input: ExecuteToolInput): Promise<T> {
    const result = await this.request<ComposioToolResult<T>>(
      'post',
      `/tools/execute/${input.tool}`,
      {
        connected_account_id: input.connected_account_id,
        user_id: input.user_id,
        arguments: input.arguments,
      },
    );

    if (!result.successful) {
      throw new BadGatewayException({
        message: result.error || `${input.tool} failed`,
        code: ErrorCodes.Integrations.PROVIDER_ERROR,
      });
    }
    return result.data;
  }

  private async request<T = unknown>(
    method: 'get' | 'post' | 'delete',
    url: string,
    data?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    if (!this.client) {
      throw new BadRequestException({
        message:
          'Integrations are not configured. Set COMPOSIO_API_KEY on the API server.',
        code: ErrorCodes.Integrations.COMPOSIO_NOT_CONFIGURED,
      });
    }

    try {
      const response = await this.client.request<T>({
        method,
        url,
        data,
        params,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{
        error?: { message?: string } | string;
        message?: string;
      }>;
      const body = axiosError.response?.data;
      const message =
        (typeof body?.error === 'object' ? body.error?.message : body?.error) ||
        body?.message ||
        axiosError.message;
      this.logger.error(
        `Composio ${method.toUpperCase()} ${url} failed: ${message}`,
      );
      throw new BadGatewayException({
        message: `Composio: ${message}`,
        code: ErrorCodes.Integrations.PROVIDER_ERROR,
      });
    }
  }
}
