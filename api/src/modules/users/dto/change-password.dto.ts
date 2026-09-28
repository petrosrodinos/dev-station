import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'oldpassword123' })
  @IsString()
  @MinLength(1)
  current_password: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'newpassword123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  new_password: string;
}
