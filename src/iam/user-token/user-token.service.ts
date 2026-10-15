import { BadRequestException, Injectable } from '@nestjs/common';
import { CommunicationService } from '@infrastructure/communication/communication.service';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ENUserTokenType } from '@prisma/client';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found';
import { maskEmail } from '@common/utils/string-func';
import { ConfigService } from '@nestjs/config';
import {
  generateOtp,
  computeTokenHash,
} from '@common/utils/token-hash.util';
import * as argon2 from 'argon2';
import { TimezoneService } from '@common/timezone/timezone.service';

@Injectable()
export class UserTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly configService: ConfigService,
    private readonly timezoneService: TimezoneService,
  ) {}

  public async userExists(userId: string) {
    if (!userId) throw new BadRequestException('User ID is required');

    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: { person: true },
    });
  }

  private fiveMinutes = 1000 * 60 * 5;

  /**
   * Generate a 6-char OTP and its HMAC-SHA-256 hash using TOKEN_HASH_SECRET.
   * The raw OTP is sent to the user (as a code in the email body and as a
   * query parameter in the magic link); only the hash is stored in the database.
   * Verification is a direct unique lookup — no iteration, no Argon2.
   */
  private giveOtpAndHash(): { otp: string; hash: string } {
    const secret = this.configService.getOrThrow<string>('TOKEN_HASH_SECRET');
    return generateOtp(secret);
  }

  /**
   * Build the magic link URL for a given flow.
   *
   * If FRONTEND_URL is configured, the link points to the frontend so it can
   * present a native UI (the frontend must then call the verify API with the token).
   *
   * If FRONTEND_URL is not configured (dev/no-frontend), the link points to
   * the backend's own verify-link endpoint, which verifies inline and returns JSON.
   *
   * @param flow   - 'verify-email' | 'reset-password'
   * @param email  - The user's email (passed as a query param so the frontend/backend knows which account)
   * @param otp    - The raw 6-char OTP to embed in the link
   */
  private buildMagicLink(
    flow: 'verify-email' | 'reset-password',
    email: string,
    otp: string,
  ): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const encodedEmail = encodeURIComponent(email);

    if (frontendUrl) {
      const path = flow === 'verify-email' ? '/auth/verify' : '/auth/reset-password';
      return `${frontendUrl}${path}?email=${encodedEmail}&token=${otp}`;
    }

    // No frontend configured — point to the backend's own GET endpoint.
    // For reset-password there is no inline backend handler (a new password
    // is required), so we skip the link in that case (caller handles it).
    return `${appUrl}/auth/email/verify-link?email=${encodedEmail}&token=${otp}`;
  }

  private verifyEmailHtmlBody(name: string, otp: string, magicLink: string) {
    return `
        <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Your Email</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f5; padding: 40px 10px;">
                    <tr>
                        <td align="center">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                                <!-- Top Accent Border -->
                                <tr>
                                    <td height="6" style="background-color: #10b981;"></td>
                                </tr>
                                <!-- Main Content Layout -->
                                <tr>
                                    <td style="padding: 40px 32px; text-align: center;">
                                        <!-- Header Title -->
                                        <h1 style="margin: 0 0 16px 0; color: #065f46; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Pitchwork</h1>
                                        
                                        <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6; text-align: left;">
                                            Hello, <strong>${name}</strong>! 
                                        </p>
                                        <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6; text-align: left;">
                                            Thank you for joining Pitchwork. Use the code below <strong>or</strong> click the button to verify your account:
                                        </p>

                                        <!-- The OTP Display Block -->
                                        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 24px 0; text-align: center;">
                                            <span style="display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #16a34a; margin-bottom: 6px;">Your Verification Code</span>
                                            <code style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #047857; letter-spacing: 8px; display: inline-block;">${otp}</code>
                                        </div>

                                        <!-- Magic Link Button -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 8px 0 24px 0;">
                                            <tr>
                                                <td align="center">
                                                    <a href="${magicLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 32px; border-radius: 8px; letter-spacing: 0.3px;">Verify my email</a>
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5; text-align: left;">
                                            ⚠️ This code and link are single-use and expire in <strong>5 minutes</strong>. If you did not request this email, you can safely ignore it.
                                        </p>
                                    </td>
                                </tr>
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #f3f4f6;">
                                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} Pitchwork. All rights reserved.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
  }

  private resetPasswordHtmlBody(firstName: string, otp: string, magicLink: string | null): string {
    const magicLinkSection = magicLink
      ? `
        <!-- Magic Link Button -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 8px 0 24px 0;">
            <tr>
                <td align="center">
                    <a href="${magicLink}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 32px; border-radius: 8px; letter-spacing: 0.3px;">Reset my password</a>
                </td>
            </tr>
        </table>`
      : `<p style="margin: 0 0 24px 0; color: #4b5563; font-size: 13px; line-height: 1.5; text-align: left;">
            Enter the code above in the app to proceed with your password reset.
         </p>`;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f5; padding: 40px 10px;">
                <tr>
                    <td align="center">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                            <!-- Top Accent Border -->
                            <tr>
                                <td height="6" style="background-color: #059669;"></td>
                            </tr>
                            <!-- Main Content Layout -->
                            <tr>
                                <td style="padding: 40px 32px; text-align: center;">
                                    <!-- Header Title -->
                                    <h1 style="margin: 0 0 16px 0; color: #065f46; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Pitchwork</h1>
                                    
                                    <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6; text-align: left;">
                                        Hello, <strong>${firstName}</strong>! 
                                    </p>
                                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6; text-align: left;">
                                        We received a request to reset the password for your Pitchwork account. Use the code below to proceed:
                                    </p>

                                    <!-- The OTP Display Block -->
                                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 24px 0; text-align: center;">
                                        <span style="display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #16a34a; margin-bottom: 6px;">Your Reset Code</span>
                                        <code style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #047857; letter-spacing: 8px; display: inline-block;">${otp}</code>
                                    </div>

                                    ${magicLinkSection}

                                    <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5; text-align: left;">
                                        ⚠️ This single-use code expires in <strong>5 minutes</strong>. If you did not make this request, your password remains secure — you can safely ignore this email.
                                    </p>
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #f3f4f6;">
                                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} Pitchwork. All rights reserved.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;
  }

  /**
   * Generate a 6-char OTP, store its HMAC hash, and email the code + magic link to the user.
   */
  public async sendVerifyEmail(email: string) {
  }


  public async verifyEmail(email: string, token: string) {}

  public async forgotPassword(email: string) {}


  public async resetPassword(dto: {
    email: string;
    token: string;
    newPassword: string;
  }) {}
}
