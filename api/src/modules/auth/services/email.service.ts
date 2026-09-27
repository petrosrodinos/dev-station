import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRole, User } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CreateJwtService } from '@/shared/utils/jwt/jwt.service';
import { createOrganizationWithOwner } from '@/modules/organizations/utils/organizations.utils';
import { RegisterEmailDto } from '../dto/register-email.dto';
import { LoginEmailDto } from '../dto/login-email.dto';
import { AuthResponse } from '../interfaces/auth.interface';

@Injectable()
export class EmailAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: CreateJwtService,
  ) {}

  async registerWithEmail(dto: RegisterEmailDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw new ConflictException('User with this email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const fullName = dto.full_name?.trim() || null;
    const displayName = fullName || email.split('@')[0];

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          full_name: fullName,
          role: AuthRole.USER,
        },
      });
      const organization = await createOrganizationWithOwner(
        tx,
        created.id,
        `${displayName}'s Workspace`,
      );
      await tx.userPreference.create({
        data: { user_id: created.id, active_organization_id: organization.id },
      });
      return created;
    });

    return this.buildAuthResponse(user);
  }

  async loginWithEmail(dto: LoginEmailDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }

  async refreshToken(userId: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const accessToken = await this.jwtService.signToken({
      id: user.id,
      role: user.role,
    });
    return {
      access_token: accessToken,
      expires_in: this.jwtService.getExpirationTime(accessToken),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role,
      },
    };
  }
}
