import { ApiProperty } from '@nestjs/swagger';
import { AuthRole } from 'generated/prisma';

export class AuthUserEntity {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Ada Lovelace', nullable: true })
  full_name: string | null;

  @ApiProperty({ nullable: true })
  avatar_url: string | null;

  @ApiProperty({ enum: AuthRole })
  role: AuthRole;
}

export class AuthResponse {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Token expiry as a unix timestamp (seconds)',
    example: 1767225600,
  })
  expires_in: number;

  @ApiProperty({ type: AuthUserEntity })
  user: AuthUserEntity;
}
