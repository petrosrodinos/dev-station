import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { EmailAuthService } from '../services/email.service';
import { RegisterEmailDto } from '../dto/register-email.dto';
import { LoginEmailDto } from '../dto/login-email.dto';
import { AuthResponse } from '../entities/auth-response.entity';

@ApiTags('Email Authentication')
@Controller('auth/email')
export class EmailAuthController {
  constructor(private readonly authService: EmailAuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user and their personal organization',
  })
  @ApiBody({ type: RegisterEmailDto })
  @ApiResponse({ status: 201, type: AuthResponse })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  registerWithEmail(@Body() dto: RegisterEmailDto) {
    return this.authService.registerWithEmail(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginEmailDto })
  @ApiResponse({ status: 200, type: AuthResponse })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  loginWithEmail(@Body() dto: LoginEmailDto) {
    return this.authService.loginWithEmail(dto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a fresh access token for the current user' })
  @ApiResponse({ status: 200, type: AuthResponse })
  refreshToken(@CurrentUser('id') userId: string) {
    return this.authService.refreshToken(userId);
  }
}
