import { ApiProperty } from '@nestjs/swagger';
import { AgentType } from 'generated/prisma';

export class AgentEntity {
  @ApiProperty({ enum: AgentType }) type: AgentType;
  @ApiProperty() name: string;
  @ApiProperty() default_executable: string;
  @ApiProperty() description: string;
  @ApiProperty() docs_url: string;
}
