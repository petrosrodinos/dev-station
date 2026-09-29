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
import { WorkspaceLayoutsService } from './workspace-layouts.service';
import { CreateLayoutDto } from './dto/create-layout.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';
import { UpdateLayoutStateDto } from './dto/update-layout-state.dto';
import {
  WorkspaceLayoutPresetEntity,
  WorkspaceLayoutStateEntity,
} from './entities/workspace-layout.entity';

/**
 * User-scoped (not organization-scoped) — a saved dock layout is an account-level UI
 * preference, same tier as appearance/shortcuts, not organization/project data.
 */
@ApiTags('Workspace Layouts')
@ApiBearerAuth()
@Controller('users/me')
@UseGuards(JwtGuard)
export class WorkspaceLayoutsController {
  constructor(private readonly layoutsService: WorkspaceLayoutsService) {}

  @Get('layouts')
  @ApiOperation({ summary: "List the current user's saved layout presets" })
  @ApiResponse({
    status: 200,
    type: WorkspaceLayoutPresetEntity,
    isArray: true,
  })
  findAll(@CurrentUser('id') userId: string) {
    return this.layoutsService.findAll(userId);
  }

  @Post('layouts')
  @ApiOperation({
    summary: 'Save the current dock layout as a new named preset',
  })
  @ApiResponse({ status: 201, type: WorkspaceLayoutPresetEntity })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateLayoutDto) {
    return this.layoutsService.create(userId, dto);
  }

  @Patch('layouts/:id')
  @ApiOperation({ summary: 'Rename and/or overwrite a saved layout preset' })
  @ApiResponse({ status: 200, type: WorkspaceLayoutPresetEntity })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLayoutDto,
  ) {
    return this.layoutsService.update(userId, id, dto);
  }

  @Delete('layouts/:id')
  @ApiOperation({
    summary: 'Delete a saved layout preset (not the default one)',
  })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.layoutsService.remove(userId, id);
  }

  @Get('layout-state')
  @ApiOperation({
    summary: 'The active preset and per-project remembered presets',
  })
  @ApiResponse({ status: 200, type: WorkspaceLayoutStateEntity })
  getState(@CurrentUser('id') userId: string) {
    return this.layoutsService.getState(userId);
  }

  @Patch('layout-state')
  @ApiOperation({
    summary: 'Switch the active preset and/or remember one for a project',
  })
  @ApiResponse({ status: 200, type: WorkspaceLayoutStateEntity })
  updateState(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLayoutStateDto,
  ) {
    return this.layoutsService.updateState(userId, dto);
  }
}
