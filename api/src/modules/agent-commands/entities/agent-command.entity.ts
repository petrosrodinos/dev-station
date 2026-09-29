import { ApiProperty } from '@nestjs/swagger';
import { AgentType } from 'generated/prisma';

export class AgentCommandEntity {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: AgentType }) agent_type: AgentType;
  @ApiProperty() command: string;
  @ApiProperty() is_default: boolean;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}
