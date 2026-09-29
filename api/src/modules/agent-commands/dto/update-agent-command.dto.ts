import { PartialType } from '@nestjs/swagger';
import { CreateAgentCommandDto } from './create-agent-command.dto';

export class UpdateAgentCommandDto extends PartialType(CreateAgentCommandDto) {}
