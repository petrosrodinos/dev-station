// Centralized API endpoints. Add one entry per feature, e.g.:
// export const ApiRoutes = { agencies: { prefix: "/agencies" } } as const;
export const ApiRoutes = {
  auth: {
    email: {
      login: "/auth/email/login",
    },
  },
  admin: {
    stats: "/admin/stats",
    users: "/admin/users",
    releases: "/admin/releases",
    release: (platform: string) => `/admin/releases/${platform}`,
    installs: "/admin/installs",
  },
};
