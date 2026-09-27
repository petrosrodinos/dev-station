import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateMemberDto {
  @ApiProperty({ description: 'Role to assign to the member' })
  @IsUUID()
  role_id: string;
}
