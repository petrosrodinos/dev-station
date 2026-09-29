import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PingInstallDto {
  @ApiProperty({
    description: 'Per-device UUID (workspaceConfig.deviceId on the app side)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  device_id: string;

  @ApiProperty({ example: 'win' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  platform: string;

  @ApiProperty({ example: 'x64' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  arch: string;

  @ApiProperty({ example: '0.1.0' })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  app_version: string;
}
