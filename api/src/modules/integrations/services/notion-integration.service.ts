import { Injectable } from '@nestjs/common';
import { ComposioService } from '@/integrations/composio/services/composio.service';
import { ComposioTools } from '@/integrations/composio/config/composio.config';
import {
  findArray,
  findInPayload,
  findObjectWithKey,
} from '@/integrations/composio/utils/composio.utils';
import { NotionPagesQueryType } from '../dto/integrations-query.schema';
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
    const markdown =
      findObjectWithKey<{ markdown: string }>(markdownPayload, 'markdown')
        ?.markdown ??
      findInPayload<string>(markdownPayload, (v) => typeof v === 'string') ??
      '';

    const view = this.toPage({ id: pageId, ...pageObject });
    return { id: view.id, title: view.title, url: view.url, markdown };
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
