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
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrganizationGuard } from '@/shared/guards/organization.guard';
import { OrgMemberOnly } from '@/shared/decorators/access.decorator';
import { CurrentMembership } from '@/shared/decorators/current-membership.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ORGANIZATION_HEADER } from '@/shared/constants/headers';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { FavoriteSkillDto } from './dto/favorite-skill.dto';
import { SkillEntity, SkillFavoriteEntity } from './entities/skill.entity';

@ApiTags('Skills')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('skills')
@UseGuards(JwtGuard, OrganizationGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @OrgMemberOnly()
  @ApiOperation({ summary: "All of the organization's custom skills" })
  @ApiResponse({ status: 200, type: SkillEntity, isArray: true })
  findAll(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.skillsService.findAll(organizationId, userId);
  }

  @Get('favorites')
  @OrgMemberOnly()
  @ApiOperation({ summary: "The caller's favorite skill refs in this organization" })
  @ApiResponse({ status: 200, type: SkillFavoriteEntity, isArray: true })
  findFavorites(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.skillsService.findFavorites(organizationId, userId);
  }

  @Post('favorites')
  @OrgMemberOnly()
  @ApiOperation({ summary: 'Favorite a skill (system-scanned or custom)' })
  @ApiResponse({ status: 201, type: SkillFavoriteEntity })
  addFavorite(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: FavoriteSkillDto,
  ) {
    return this.skillsService.addFavorite(organizationId, userId, dto);
  }

  @Delete('favorites/:id')
  @OrgMemberOnly()
  @ApiOperation({ summary: 'Unfavorite a skill' })
  removeFavorite(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.skillsService.removeFavorite(organizationId, userId, id);
  }

  @Get(':id')
  @OrgMemberOnly()
  @ApiOperation({ summary: 'Get a custom skill' })
  @ApiResponse({ status: 200, type: SkillEntity })
  findOne(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.skillsService.findOne(organizationId, userId, id);
  }

  @Post()
  @OrgMemberOnly()
  @ApiOperation({ summary: 'Create a custom skill' })
  @ApiResponse({ status: 201, type: SkillEntity })
  create(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSkillDto,
  ) {
    return this.skillsService.create(organizationId, userId, dto);
  }

  @Patch(':id')
  @OrgMemberOnly()
  @ApiOperation({ summary: 'Update a custom skill' })
  @ApiResponse({ status: 200, type: SkillEntity })
  update(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSkillDto,
  ) {
    return this.skillsService.update(organizationId, userId, id, dto);
  }

  @Delete(':id')
  @OrgMemberOnly()
  @ApiOperation({ summary: 'Delete a custom skill' })
  remove(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.skillsService.remove(organizationId, userId, id);
  }
}
