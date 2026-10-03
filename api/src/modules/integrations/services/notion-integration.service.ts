import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ErrorCodes } from '@/shared/config/error-codes';
import { ComposioService } from '@/integrations/composio/services/composio.service';
import { ComposioTools } from '@/integrations/composio/config/composio.config';
import {
  findArray,
  findInPayload,
  findObjectWithKey,
} from '@/integrations/composio/utils/composio.utils';
import { NotionPagesQueryType } from '../dto/integrations-query.schema';
import { CreateNotionPageDto } from '../dto/create-notion-page.dto';
import { UpdateNotionPageDto } from '../dto/update-notion-page.dto';
import {
  ActiveConnection,
  NotionPage,
} from '../interfaces/integrations.interface';

const PAGE_SIZE = 50;

@Injectable()
export class NotionIntegrationService {
  constructor(private readonly composio: ComposioService) {}

  async searchPages(
    connection: ActiveConnection,
    query: NotionPagesQueryType,
  ): Promise<NotionPage[]> {
    const data = await this.composio.executeTool({
      tool: ComposioTools.NOTION_SEARCH,
      connected_account_id: connection.composio_account_id,
      user_id: connection.composio_user_id,
      arguments: { query: query.search ?? '', page_size: PAGE_SIZE },
    });
    return findArray<Record<string, any>>(data, ['results']).map((item) =>
      this.toPage(item),
    );
  }

  async getPage(connection: ActiveConnection, pageId: string) {
    const [page, markdownPayload] = await Promise.all([
      this.composio.executeTool({
        tool: ComposioTools.NOTION_RETRIEVE_PAGE,
        connected_account_id: connection.composio_account_id,
        user_id: connection.composio_user_id,
        arguments: { page_id: pageId },
      }),
      this.composio.executeTool({
        tool: ComposioTools.NOTION_PAGE_MARKDOWN,
        connected_account_id: connection.composio_account_id,
        user_id: connection.composio_user_id,
        arguments: { page_id: pageId },
      }),
    ]);

    const pageObject =
      findObjectWithKey<Record<string, any>>(page, 'properties') ?? {};
    const markdownObject = findObjectWithKey<{
      markdown: string;
      truncated?: boolean;
      unknown_block_ids?: string[];
    }>(markdownPayload, 'markdown');
    const markdown =
      markdownObject?.markdown ??
      findInPayload<string>(markdownPayload, (v) => typeof v === 'string') ??
      '';

    const view = this.toPage({ id: pageId, ...pageObject });
    return {
      id: view.id,
      title: view.title,
      url: view.url,
      last_edited_time: view.last_edited_time,
      markdown,
      editable: this.isEditable(markdownObject),
    };
  }

  async createPage(connection: ActiveConnection, dto: CreateNotionPageDto) {
    const data = await this.composio.executeTool({
      tool: ComposioTools.NOTION_CREATE_PAGE,
      connected_account_id: connection.composio_account_id,
      user_id: connection.composio_user_id,
      arguments: {
        parent_id: dto.parent_id,
        title: dto.title,
        ...(dto.markdown && { markdown: dto.markdown }),
      },
    });
    const created = findObjectWithKey<Record<string, any>>(data, 'id');
    if (!created?.id) {
      throw new BadGatewayException({
        message: 'Notion did not return the created page',
        code: ErrorCodes.Integrations.PROVIDER_ERROR,
      });
    }
    return this.getPage(connection, created.id);
  }

  async updatePage(
    connection: ActiveConnection,
    pageId: string,
    dto: UpdateNotionPageDto,
  ) {
    if (dto.title !== undefined) {
      // The title property's id is always "title", whatever it is named in a database.
      await this.composio.executeTool({
        tool: ComposioTools.NOTION_UPDATE_PAGE,
        connected_account_id: connection.composio_account_id,
        user_id: connection.composio_user_id,
        arguments: {
          page_id: pageId,
          properties: { title: { title: [{ text: { content: dto.title } }] } },
        },
      });
    }
    if (dto.markdown !== undefined) {
      // Replacing the body of a page we can't fully represent as markdown would drop content.
      const current = await this.composio.proxy<{
        truncated?: boolean;
        unknown_block_ids?: string[];
      }>({
        connected_account_id: connection.composio_account_id,
        endpoint: `/v1/pages/${encodeURIComponent(pageId)}/markdown`,
        method: 'GET',
      });
      if (!this.isEditable(current)) {
        throw new BadRequestException({
          message:
            'This page has content that cannot be edited as markdown. Edit it in Notion instead.',
          code: ErrorCodes.Integrations.NOTION_PAGE_NOT_EDITABLE,
        });
      }
      // No Composio tool writes markdown, so go straight to Notion's markdown endpoint.
      await this.composio.proxy({
        connected_account_id: connection.composio_account_id,
        endpoint: `/v1/pages/${encodeURIComponent(pageId)}/markdown`,
        method: 'PATCH',
        body: {
          type: 'replace_content',
          replace_content: { new_str: dto.markdown },
        },
      });
    }
    return this.getPage(connection, pageId);
  }

  async archivePage(connection: ActiveConnection, pageId: string) {
    await this.composio.executeTool({
      tool: ComposioTools.NOTION_ARCHIVE_PAGE,
      connected_account_id: connection.composio_account_id,
      user_id: connection.composio_user_id,
      arguments: { page_id: pageId, archive: true },
    });
  }

  private isEditable(
    payload: { truncated?: boolean; unknown_block_ids?: string[] } | undefined,
  ) {
    return (
      !!payload && !payload.truncated && !payload.unknown_block_ids?.length
    );
  }

  private toPage(item: Record<string, any>): NotionPage {
    return {
      id: item.id,
      title: this.extractTitle(item),
      url: item.url ?? null,
      last_edited_time: item.last_edited_time ?? null,
      object: item.object ?? 'page',
    };
  }

  private extractTitle(item: Record<string, any>): string {
    const richText = (parts?: { plain_text?: string }[]) =>
      (parts ?? []).map((p) => p.plain_text ?? '').join('');
    if (Array.isArray(item.title)) return richText(item.title) || 'Untitled';

    const titleProperty = Object.values(item.properties ?? {}).find(
      (p: any) => p?.type === 'title',
    ) as { title?: { plain_text?: string }[] } | undefined;
    return richText(titleProperty?.title) || 'Untitled';
  }
}
