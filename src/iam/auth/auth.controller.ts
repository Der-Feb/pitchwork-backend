import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterUserPersonDto } from './auth.dto';
import { Response } from 'express';
import {
  PassportJwtGuard,
  PassportLocalGuard,
} from '@common/guards/passport.guard';
import { CurrentUser } from '@common/decorators/current-user';
import { TPayload, TUserData } from './auth.types';
import { UserTokenService } from '../user-token/user-token.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SendVerifyEmailDto,
  VerifyEmailDto,
} from '../user-token/user-token.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userTokenService: UserTokenService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('/signup')
  public async register(
    @Body() registerDto: RegisterUserPersonDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userData = await this.authService.registerUserPerson(registerDto);

    await this.authService.assignCookie(
      {
        sub: userData.user_id,
        person_id: userData.person_id,
      },
      res,
    );

    return {
      message: 'Registered successfully',
      user: userData,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('/signin')
  @UseGuards(PassportLocalGuard)
  public async login(
    @Body() loginDto: LoginDto,
    @CurrentUser() userData: TUserData,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.assignCookie(
      {
        sub: userData.user_id,
        person_id: userData.person_id,
      },
      res,
    );

    return {
      message: 'Logged in Successfully',
      user: userData,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('/signout')
  public async signout(@Res({ passthrough: true }) res: Response) {
    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0), // Setting expiration date to Jan 1, 1970 (tells browser to delete it instantly)
    });

    return {
      message: 'Signed out successfully',
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get('/me')
  @UseGuards(PassportJwtGuard)
  public async getMe(@CurrentUser() user: any) {
    const { user_id, person_id } = user;
    return await this.authService.getUserData(user_id, person_id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('email/send-verify')
  public async sendVerifyEmail(@Body() data: SendVerifyEmailDto) {
    return await this.userTokenService.sendVerifyEmail(data.email);
  }

  @HttpCode(HttpStatus.OK)
  @Put('email/verify')
  public async verifyEMail(@Body() data: VerifyEmailDto) {
    return await this.userTokenService.verifyEmail(data.email, data.token);
  }

  /**
   * Magic-link target for email verification when no frontend is configured.
   *
   * The link embedded in the verification email points here (via APP_URL) when
   * FRONTEND_URL is absent. Once a frontend exists, it handles the link instead
   * and this endpoint is no longer reached via email.
   *
   * Usage: GET /auth/email/verify-link?email=user@example.com&token=AB12CD
   */
  @HttpCode(HttpStatus.OK)
  @Get('email/verify-link')
  public async verifyEmailViaLink(
    @Query('email') email: string,
    @Query('token') token: string,
  ) {
    return await this.userTokenService.verifyEmail(
      email?.trim().toLowerCase(),
      token?.trim().toUpperCase(),
    );
  }

  @Post('password/forgot')
  public async forgotPassword(@Body() data: ForgotPasswordDto) {
    return await this.userTokenService.forgotPassword(data.email);
  }

  @Put('password/reset')
  public async resetPassword(@Body() data: ResetPasswordDto) {
    return await this.userTokenService.resetPassword(data);
  }
}
