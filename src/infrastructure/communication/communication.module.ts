import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST') || '127.0.0.1',
          port: configService.get('MAIL_PORT') || 1025,
          ignoreTLS: true,
          secure: false,
        },
        defaults: { from: `"Pitchwork" <${configService.get('MAIL_FROM')}>` },
      }),
    }),
  ],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
