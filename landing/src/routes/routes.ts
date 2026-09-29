// Centralized frontend paths — used as <Link href>, router.push(), and redirect() targets.
export const Routes = {
  home: "/",
  /** Hidden admin console — never linked from nav; reachable only by direct URL. */
  admin: {
    login: "/ops-console-7f2a",
    root: "/ops-console-7f2a/dashboard",
    overview: "/ops-console-7f2a/dashboard/overview",
    users: "/ops-console-7f2a/dashboard/users",
    releases: "/ops-console-7f2a/dashboard/releases",
  },
} as const;
