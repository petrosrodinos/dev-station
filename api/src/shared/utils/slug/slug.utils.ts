import { randomBytes } from 'crypto';

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';

export const uniqueSlug = (value: string) =>
  `${slugify(value)}-${randomBytes(3).toString('hex')}`;
