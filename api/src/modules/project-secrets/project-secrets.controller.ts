import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import { RequirePermissions } from '@/shared/decorators/access.decorator';
import { CurrentMembership } from '@/shared/decorators/current-membership.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ORGANIZATION_HEADER } from '@/shared/constants/headers';
import { ProjectSecretsService } from './project-secrets.service';
import { CreateSecretSetDto } from './dto/create-secret-set.dto';
import { UpdateSecretSetDto } from './dto/update-secret-set.dto';
import {
  SecretSetEntity,
  SecretSetSummaryEntity,
} from './entities/project-secrets.entity';

const NO_STORE = 'no-store';

@ApiTags('Project secrets')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('projects/:projectId/secret-sets')
@UseGuards(JwtGuard, OrganizationGuard)
export class ProjectSecretsController {
  constructor(private readonly secretsService: ProjectSecretsService) {}

  @Get()
  @RequirePermissions(PermissionKey.SECRETS_VIEW)
  @Header('Cache-Control', NO_STORE)
  @ApiOperation({ summary: 'Secret sets of a project (names only, no values)' })
  @ApiResponse({ status: 200, type: SecretSetSummaryEntity, isArray: true })
  findAll(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.secretsService.findAll(organizationId, projectId);
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.SECRETS_VIEW)
  @Header('Cache-Control', NO_STORE)
  @ApiOperation({ summary: 'A secret set with its decrypted variables' })
  @ApiResponse({ status: 200, type: SecretSetEntity })
  findOne(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.secretsService.findOne(organizationId, projectId, id);
  }

  @Post()
  @RequirePermissions(PermissionKey.SECRETS_MANAGE)
  @Header('Cache-Control', NO_STORE)
  @ApiOperation({ summary: 'Create a secret set (values are encrypted)' })
  @ApiResponse({ status: 201, type: SecretSetEntity })
  create(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateSecretSetDto,
  ) {
    return this.secretsService.create(organizationId, projectId, userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.SECRETS_MANAGE)
  @Header('Cache-Control', NO_STORE)
  @ApiOperation({ summary: 'Update a secret set' })
  @ApiResponse({ status: 200, type: SecretSetEntity })
  update(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSecretSetDto,
  ) {
    return this.secretsService.update(
      organizationId,
      projectId,
      id,
      userId,
      dto,
    );
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.SECRETS_MANAGE)
  @ApiOperation({ summary: 'Delete a secret set' })
  remove(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.secretsService.remove(organizationId, projectId, id, userId);
  }
}
