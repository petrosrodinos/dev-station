import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AppReleasesService } from './app-releases.service';
import { PingInstallDto } from './dto/ping-install.dto';
import { UpsertReleaseDto } from './dto/upsert-release.dto';
import { AppReleaseEntity } from './entities/app-release.entity';
import { ReleaseTokenGuard } from './guards/release-token.guard';

@ApiTags('App releases')
@Controller('app-releases')
export class AppReleasesController {
  constructor(private readonly appReleasesService: AppReleasesService) {}

  @Post('ping')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Device heartbeat for version adoption tracking' })
  async ping(@Body() dto: PingInstallDto) {
    await this.appReleasesService.ping(dto);
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Latest published version + minimum supported version',
  })
  @ApiResponse({ status: 200, type: AppReleaseEntity })
  getLatest(@Query('platform') platform: string) {
    return this.appReleasesService.getLatest(platform);
  }

  @Get()
  @ApiOperation({
    summary: "Every platform's current release — public downloads page",
  })
  @ApiResponse({ status: 200, type: AppReleaseEntity, isArray: true })
  getAll() {
    return this.appReleasesService.getAll();
  }

  @Get('download')
  @ApiOperation({
    summary: 'Stable download link — redirects to the latest installer',
  })
  async download(@Query('platform') platform: string, @Res() res: Response) {
    const url = await this.appReleasesService.recordDownload(platform);
    res.redirect(HttpStatus.FOUND, url);
  }

  @Patch(':platform')
  @UseGuards(ReleaseTokenGuard)
  @ApiOperation({
    summary: 'Publish/update the latest release for a platform (CI only)',
  })
  @ApiResponse({ status: 200, type: AppReleaseEntity })
  upsertRelease(
    @Param('platform') platform: string,
    @Body() dto: UpsertReleaseDto,
  ) {
    return this.appReleasesService.upsertRelease(platform, dto);
  }
}
