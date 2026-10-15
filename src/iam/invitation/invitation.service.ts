import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { CommunicationService } from '@infrastructure/communication/communication.service';
import { ConfigService } from '@nestjs/config';
import { TimezoneService } from '@common/timezone/timezone.service';
import {
  ENInvitationStatus,
  ENMembershipStatus,
  ENMembershipType,
} from '@prisma/client';
import {
  AcceptInvitationDto,
  InviteUserDto,
} from '../membership/membership.dto';
import { TActiveMembershipPayload } from '@common/guards/active-membership.guard';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found';
import {
  generateApplicationToken,
  computeTokenHash,
} from '@common/utils/token-hash.util';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly configService: ConfigService,
    private readonly timezoneService: TimezoneService,
  ) {}

  private defaultInvitationTtlMs = 1000 * 60 * 60 * 48; // 48 hours

  /**
   * Generate a CSPRNG token and its HMAC-SHA-256 hash using TOKEN_HASH_SECRET.
   * The raw token is sent to the user (in the URL / email code); only the hash
   * is stored in the database. Validation is a direct unique lookup.
   */
  private giveTokenAndHash(): { token: string; hash: string } {
    const secret = this.configService.getOrThrow<string>('TOKEN_HASH_SECRET');
    return generateApplicationToken(secret);
  }

  private inviteUserHtmlBody(
    inviterName: string,
    clubName: string,
    inviteUrl: string,
    token: string,
    type: ENMembershipType,
    teamName: string | null = null,
  ): string {
    const membershipType = type.toLowerCase();

    const roleDescription = teamName
      ? `as a <strong>${membershipType}</strong> on team <strong>${teamName}</strong>`
      : `as a <strong>${membershipType}</strong>`;

    return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>You're Invited to ${clubName} on Pitchwork</title>
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
                                            Hello! 
                                        </p>
                                        <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6; text-align: left;">
                                            <strong>${inviterName}</strong> has invited you to join <strong>${clubName}</strong> ${roleDescription} on Pitchwork. Click the button below to accept your invitation and set up your account:
                                        </p>

                                        <!-- Call To Action Button -->
                                        <div style="margin: 32px 0 24px 0; text-align: center;">
                                            <a href="${inviteUrl}" target="_blank" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                                                Join ${clubName}
                                            </a>
                                        </div>

                                        <!-- Manual Token Box Fallback -->
                                        <div style="margin: 0 0 24px 0; padding: 16px; background-color: #f0fdf4; border: 1px dashed #a7f3d0; border-radius: 8px; text-align: center;">
                                            <p style="margin: 0 0 6px 0; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                                Or enter this invitation code in the app:
                                            </p>
                                            <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 18px; font-weight: 700; color: #047857; letter-spacing: 1px; word-break: break-all; user-select: all;">
                                                ${token}
                                            </div>
                                        </div>

                                        <!-- Raw Link Fallback -->
                                        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 13px; line-height: 1.5; text-align: left; word-break: break-all;">
                                            If the button above doesn't work, copy and paste this link into your browser:<br>
                                            <a href="${inviteUrl}" style="color: #059669; text-decoration: underline;">${inviteUrl}</a>
                                        </p>

                                        <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5; text-align: left;">
                                            ⚠️ This invitation link and code are intended specifically for you. If you were not expecting this invitation, you can safely ignore this email.
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

  public async inviteUser(
    inviterMembership: TActiveMembershipPayload,
    inviteData: InviteUserDto,
  ) {}

  public async acceptInvitation(acceptData: AcceptInvitationDto) {}
}
