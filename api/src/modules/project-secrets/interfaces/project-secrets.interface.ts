import { Prisma } from 'generated/prisma';

export const secretSetInclude = {
  updater: { select: { id: true, email: true, full_name: true } },
} satisfies Prisma.ProjectSecretSetInclude;

export interface SecretVariable {
  key: string;
  value: string;
}

/** List shape: never carries values. */
export interface SecretSetSummary {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  variable_count: number;
  updated_at: Date;
  created_at: Date;
  updated_by: { id: string; email: string; full_name: string | null } | null;
}

export interface SecretSetView extends SecretSetSummary {
  variables: SecretVariable[];
}
