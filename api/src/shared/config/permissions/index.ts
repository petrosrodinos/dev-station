import { PermissionKey, SystemRoleKey } from 'generated/prisma';

export const PermissionGroups = {
  PROJECTS: 'Projects',
  GIT: 'Git',
  AI: 'AI',
  INTEGRATIONS: 'Integrations',
  ORGANIZATION: 'Organization',
} as const;

export const PermissionCatalog: {
  key: PermissionKey;
  group: string;
  label: string;
}[] = [
  {
    key: PermissionKey.PROJECTS_VIEW,
    group: PermissionGroups.PROJECTS,
    label: 'View',
  },
  {
    key: PermissionKey.PROJECTS_CREATE,
    group: PermissionGroups.PROJECTS,
    label: 'Create',
  },
  {
    key: PermissionKey.PROJECTS_EDIT,
    group: PermissionGroups.PROJECTS,
    label: 'Edit',
  },
  {
    key: PermissionKey.PROJECTS_DELETE,
    group: PermissionGroups.PROJECTS,
    label: 'Delete',
  },
  {
    key: PermissionKey.GIT_VIEW_CHANGES,
    group: PermissionGroups.GIT,
    label: 'View changes',
  },
  {
    key: PermissionKey.GIT_COMMIT,
    group: PermissionGroups.GIT,
    label: 'Commit',
  },
  { key: PermissionKey.GIT_PUSH, group: PermissionGroups.GIT, label: 'Push' },
  {
    key: PermissionKey.GIT_MANAGE_BRANCHES,
    group: PermissionGroups.GIT,
    label: 'Manage branches',
  },
  {
    key: PermissionKey.AI_START_AGENTS,
    group: PermissionGroups.AI,
    label: 'Start agents',
  },
  {
    key: PermissionKey.AI_USE_AGENTS,
    group: PermissionGroups.AI,
    label: 'Use agents',
  },
  {
    key: PermissionKey.INTEGRATIONS_VIEW,
    group: PermissionGroups.INTEGRATIONS,
    label: 'View',
  },
  {
    key: PermissionKey.INTEGRATIONS_CONNECT,
    group: PermissionGroups.INTEGRATIONS,
    label: 'Connect',
  },
  {
    key: PermissionKey.INTEGRATIONS_DISCONNECT,
    group: PermissionGroups.INTEGRATIONS,
    label: 'Disconnect',
  },
  {
    key: PermissionKey.INTEGRATIONS_MANAGE,
    group: PermissionGroups.INTEGRATIONS,
    label: 'Manage',
  },
  {
    key: PermissionKey.ORG_MANAGE_MEMBERS,
    group: PermissionGroups.ORGANIZATION,
    label: 'Manage members',
  },
  {
    key: PermissionKey.ORG_MANAGE_ROLES,
    group: PermissionGroups.ORGANIZATION,
    label: 'Manage roles',
  },
  {
    key: PermissionKey.ORG_MANAGE_SETTINGS,
    group: PermissionGroups.ORGANIZATION,
    label: 'Manage settings',
  },
];

export const DEFAULT_CUSTOM_ROLE_RANK = 50;

const ALL_PERMISSIONS = Object.values(PermissionKey) as PermissionKey[];

const GIT_ALL: PermissionKey[] = [
  PermissionKey.GIT_VIEW_CHANGES,
  PermissionKey.GIT_COMMIT,
  PermissionKey.GIT_PUSH,
  PermissionKey.GIT_MANAGE_BRANCHES,
];

const AI_ALL: PermissionKey[] = [
  PermissionKey.AI_START_AGENTS,
  PermissionKey.AI_USE_AGENTS,
];

/** Default permission set of each system role, seeded when an organization is created. */
export const SystemRoles: {
  key: SystemRoleKey;
  name: string;
  description: string;
  rank: number;
  permissions: PermissionKey[];
}[] = [
  {
    key: SystemRoleKey.OWNER,
    name: 'Owner',
    description: 'Full access, including deleting the organization',
    rank: 100,
    permissions: ALL_PERMISSIONS,
  },
  {
    key: SystemRoleKey.ADMIN,
    name: 'Admin',
    description: 'Full access to projects, integrations, members and settings',
    rank: 80,
    permissions: ALL_PERMISSIONS,
  },
  {
    key: SystemRoleKey.MANAGER,
    name: 'Manager',
    description: 'Manages projects and connects integrations',
    rank: 60,
    permissions: [
      PermissionKey.PROJECTS_VIEW,
      PermissionKey.PROJECTS_CREATE,
      PermissionKey.PROJECTS_EDIT,
      ...GIT_ALL,
      ...AI_ALL,
      PermissionKey.INTEGRATIONS_VIEW,
      PermissionKey.INTEGRATIONS_CONNECT,
    ],
  },
  {
    key: SystemRoleKey.DEVELOPER,
    name: 'Developer',
    description: 'Works on projects with Git and AI agents',
    rank: 40,
    permissions: [
      PermissionKey.PROJECTS_VIEW,
      ...GIT_ALL,
      ...AI_ALL,
      PermissionKey.INTEGRATIONS_VIEW,
    ],
  },
  {
    key: SystemRoleKey.VIEWER,
    name: 'Viewer',
    description: 'Read-only access',
    rank: 20,
    permissions: [
      PermissionKey.PROJECTS_VIEW,
      PermissionKey.GIT_VIEW_CHANGES,
      PermissionKey.INTEGRATIONS_VIEW,
    ],
  },
];
