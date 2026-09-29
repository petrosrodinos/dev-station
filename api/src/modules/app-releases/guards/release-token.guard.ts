import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Machine-to-machine guard for the release-publish endpoint (called by CI, not a logged-in
 * user), checked against a shared secret rather than a JWT.
 */
@Injectable()
export class ReleaseTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('RELEASE_PUBLISH_TOKEN');
    if (!expected) {
      throw new UnauthorizedException('Release publishing is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-release-token');
    if (provided !== expected) {
      throw new UnauthorizedException('Invalid release token');
    }

    return true;
  }
}
