import { Injectable } from '@nestjs/common';
import { AgentCatalog } from '@/shared/config/agents';

@Injectable()
export class AgentsService {
  findAll() {
    return AgentCatalog;
  }
}
