import { ConnectionStatus, IntegrationProvider } from 'generated/prisma';

export interface ConnectionView {
  id: string;
  provider: IntegrationProvider;
  label: string;
  external_account: string | null;
  status: ConnectionStatus;
  is_default: boolean;
  last_error: string | null;
  created_at: Date;
  user: { id: string; full_name: string | null; email: string };
}

export interface IntegrationView {
  provider: IntegrationProvider;
  name: string;
  description: string;
  available: boolean;
  supported: boolean;
  capabilities: string[];
  connections: ConnectionView[];
}

/** Connection resolved for a provider call; `composio_user_id` is the Composio user that owns the account. */
export interface ActiveConnection {
  id: string;
  composio_account_id: string;
  composio_user_id: string;
}

export interface GithubRepository {
  id: string;
  name: string;
  full_name: string;
  clone_url: string;
  ssh_url: string | null;
  default_branch: string | null;
  private: boolean;
  description: string | null;
  updated_at: string | null;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number;
  priority_label: string;
  url: string;
  state: { id: string; name: string; type: string; color: string } | null;
  assignee: { id: string; name: string; avatar_url: string | null } | null;
  labels: { id: string; name: string; color: string }[];
  team: { id: string; key: string; name: string } | null;
  project: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
  comments?: {
    id: string;
    body: string;
    created_at: string;
    user: { id: string; name: string; avatar_url: string | null } | null;
  }[];
}

export interface NotionPage {
  id: string;
  title: string;
  url: string | null;
  last_edited_time: string | null;
  object: string;
}
