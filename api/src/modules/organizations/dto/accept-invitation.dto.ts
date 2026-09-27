import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Invitation token received by email or from the inviter',
  })
  @IsString()
  @MinLength(16)
  token: string;
}
