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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { GitIdentitiesService } from './git-identities.service';
import { CreateGitIdentityDto } from './dto/create-git-identity.dto';
import { UpdateGitIdentityDto } from './dto/update-git-identity.dto';
import { GitIdentityEntity } from './entities/git-identity.entity';

@ApiTags('Git identities')
@ApiBearerAuth()
@Controller('git-identities')
@UseGuards(JwtGuard)
export class GitIdentitiesController {
  constructor(private readonly gitIdentitiesService: GitIdentitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List commit identities (default first)' })
  @ApiResponse({ status: 200, type: GitIdentityEntity, isArray: true })
  findAll(@CurrentUser('id') userId: string) {
    return this.gitIdentitiesService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a commit identity' })
  @ApiResponse({ status: 201, type: GitIdentityEntity })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateGitIdentityDto) {
    return this.gitIdentitiesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a commit identity or make it the default' })
  @ApiResponse({ status: 200, type: GitIdentityEntity })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGitIdentityDto,
  ) {
    return this.gitIdentitiesService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a commit identity' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.gitIdentitiesService.remove(userId, id);
  }
}
