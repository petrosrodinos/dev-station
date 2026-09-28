/**
 * Holds the permission snapshot pushed by the renderer. Defense-in-depth only, NOT a security
 * boundary: a modified renderer can lie. The API is the real enforcement point.
 */
class AccessManager {
  private permissions = new Set<string>();

  sync(permissions: string[]) {
    this.permissions = new Set(permissions);
  }

  missing(required: readonly string[]): string[] {
    return required.filter((p) => !this.permissions.has(p));
  }
}

export const accessManager = new AccessManager();
