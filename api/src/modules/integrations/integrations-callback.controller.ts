import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

// No auth guards: this is the page Composio redirects the user's system
// browser to after they finish OAuth for a provider (GitHub/Linear/Notion).
// The Electron app never loads it - it polls
// POST /integrations/connections/:id/refresh instead - so all this has to do
// is tell the person it's safe to close the tab.
@ApiExcludeController()
@Controller('integrations/callback')
export class IntegrationsCallbackController {
  @Get()
  get(@Res() response: Response) {
    response.status(200).type('html').send(CALLBACK_HTML);
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
