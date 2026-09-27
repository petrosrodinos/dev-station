export type ComposioAccountStatus =
  | 'INITIALIZING'
  | 'INITIATED'
  | 'ACTIVE'
  | 'FAILED'
  | 'EXPIRED'
  | 'INACTIVE'
  | string;

export interface ComposioConnectionRequest {
  id: string;
  redirect_url: string | null;
  status: ComposioAccountStatus;
}

export interface ComposioConnectedAccount {
  id: string;
  status: ComposioAccountStatus;
  status_reason?: string | null;
  toolkit?: { slug: string };
  auth_config?: { id: string };
  user_id?: string;
  [key: string]: unknown;
}

export interface ComposioToolResult<T = unknown> {
  data: T;
  error: string | null;
  successful: boolean;
  log_id?: string;
}

export interface ExecuteToolInput {
  tool: string;
  connected_account_id: string;
  user_id: string;
  arguments: Record<string, unknown>;
}
