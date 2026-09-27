import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JsonWebTokenError } from 'jsonwebtoken';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext().req;
    }
    return context.switchToHttp().getRequest();
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ) {
    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException({
        message: 'Invalid token',
        code: 'invalid_token',
      });
    }

    if (err || !user) {
      throw new UnauthorizedException({
        message: 'Authentication required',
        code: 'authentication_required',
      });
    }

    if (context.getType<string>() === 'graphql') {
      GqlExecutionContext.create(context).getContext().user = user;
    }

    return super.handleRequest(err, user, info, context, status);
  }
}
