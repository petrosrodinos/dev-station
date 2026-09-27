import { Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

// No auth guards: this is the page Composio redirects the user's system
// browser to after they finish OAuth for a provider (GitHub/Linear/Notion).
// It bounces the browser straight back to the Integrations settings page in
// the app - the app itself still polls
// POST /integrations/connections/:id/refresh to flip the connection to
// "Connected", this page just gets the person back there.
@ApiExcludeController()
@Controller('integrations/callback')
export class IntegrationsCallbackController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  get(
    @Query() query: Record<string, string>,
    @Res() response: Response,
  ) {
    const appUrl = this.config.get<string>('APP_URL');
    if (!appUrl) {
      response.status(200).type('html').send(CALLBACK_HTML);
      return;
    }

    const redirectUrl = new URL(
      '/workspace/settings/integrations',
      appUrl,
    );
    for (const [key, value] of Object.entries(query)) {
      if (value) redirectUrl.searchParams.set(key, value);
    }
    response.redirect(302, redirectUrl.toString());
  }
}

const CALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Connected · Dev Station</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        display: flex;
        min-height: 100vh;
        align-items: center;
        justify-content: center;
        background: #0b0b0f;
        color: #f4f4f5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        text-align: center;
        padding: 24px;
      }
      h1 {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 8px;
      }
      p {
        margin: 0;
        color: #a1a1aa;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>You're connected</h1>
      <p>You can close this tab and go back to Dev Station.</p>
    </main>
  </body>
</html>
`;
