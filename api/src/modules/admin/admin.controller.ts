import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { AuthRoles } from '@/modules/auth/interfaces/auth.interface';
import { AdminService } from './admin.service';
import {
  AdminUsersQuerySchema,
  AdminUsersQueryType,
} from './dto/admin-users-query.schema';
import { UpdateReleaseLimitsDto } from './dto/update-release-limits.dto';
import { AdminStatsEntity } from './entities/admin-stats.entity';
import { AdminUserEntity } from './entities/admin-user.entity';
import {
  AdminInstallAdoptionEntity,
  AdminReleaseEntity,
} from './entities/admin-release.entity';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRoles.ADMIN, AuthRoles.SUPPORT)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'User growth and activity overview' })
  @ApiResponse({ status: 200, type: AdminStatsEntity })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Paginated, searchable list of all users' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: AdminUserEntity, isArray: true })
  getUsers(
    @Query(new ZodValidationPipe(AdminUsersQuerySchema))
    query: AdminUsersQueryType,
  ) {
    return this.adminService.getUsers(query);
  }

  @Get('releases')
  @ApiOperation({ summary: "Every platform's published desktop release" })
  @ApiResponse({ status: 200, type: AdminReleaseEntity, isArray: true })
  getReleases() {
    return this.adminService.getReleases();
  }

  @Patch('releases/:platform')
  @ApiOperation({
    summary:
      'Hand-set min_version/release_notes for a platform (CI owns version/download_url)',
  })
  @ApiResponse({ status: 200, type: AdminReleaseEntity })
  updateReleaseLimits(
    @Param('platform') platform: string,
    @Body() dto: UpdateReleaseLimitsDto,
  ) {
    return this.adminService.updateReleaseLimits(platform, dto);
  }

  @Get('installs')
  @ApiOperation({ summary: 'Device adoption by platform + app version' })
  @ApiResponse({ status: 200, type: AdminInstallAdoptionEntity })
  getInstallAdoption() {
    return this.adminService.getInstallAdoption();
  }
}
