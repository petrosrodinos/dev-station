import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionKey } from 'generated/prisma';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrganizationGuard } from '@/shared/guards/organization.guard';
import { RequirePermissions } from '@/shared/decorators/require-permissions.decorator';
import { CurrentMembership } from '@/shared/decorators/current-membership.decorator';
import { ORGANIZATION_HEADER } from '@/shared/constants/headers';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientEntity } from './entities/client.entity';

@ApiTags('Clients')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('clients')
@UseGuards(JwtGuard, OrganizationGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'List clients' })
  @ApiResponse({ status: 200, type: ClientEntity, isArray: true })
  findAll(@CurrentMembership('organization_id') organizationId: string) {
    return this.clientsService.findAll(organizationId);
  }

  @Post()
  @RequirePermissions(PermissionKey.PROJECTS_CREATE)
  @ApiOperation({ summary: 'Create a client' })
  @ApiResponse({ status: 201, type: ClientEntity })
  create(
    @CurrentMembership('organization_id') organizationId: string,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.create(organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.PROJECTS_EDIT)
  @ApiOperation({ summary: 'Update a client' })
  @ApiResponse({ status: 200, type: ClientEntity })
  update(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.PROJECTS_DELETE)
  @ApiOperation({ summary: 'Delete a client (projects are kept, unassigned)' })
  remove(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.remove(organizationId, id);
  }
}
