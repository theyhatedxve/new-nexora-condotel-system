import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import nodemailer from 'nodemailer';

export const STAFF_INVITATION_MINUTES = 30;

export type InvitationDelivery =
  | 'SMTP_ACCEPTED'
  | 'UNKNOWN';

@Injectable()
export class StaffInvitationService {
  private configuration() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const username = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;
    const setupUrl = process.env.STAFF_SETUP_URL;

    if (
      !host ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !username ||
      !password ||
      !from ||
      !setupUrl
    ) {
      throw new ServiceUnavailableException(
        'Staff invitation email is not configured.',
      );
    }

    let url: URL;

    try {
      url = new URL(setupUrl);
    } catch {
      throw new ServiceUnavailableException(
        'Staff setup URL is invalid.',
      );
    }

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (
        process.env.NODE_ENV === 'production' &&
        url.protocol !== 'https:'
      )
    ) {
      throw new ServiceUnavailableException(
        'Staff setup URL configuration is invalid.',
      );
    }

    return {
      host,
      port,
      username,
      password,
      from,
      url,
    };
  }

  assertConfigured(): void {
    this.configuration();
  }

  async send(
    email: string,
    token: string,
  ): Promise<InvitationDelivery> {
    try {
      const config = this.configuration();

      config.url.hash = new URLSearchParams({ token }).toString();

      const transport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.username,
          pass: config.password,
        },
        requireTLS: config.port !== 465,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      });

      try {
        const result = await transport.sendMail({
          from: config.from,
          to: email,
          subject: 'Set up your NEXORA staff password',
          text: [
            'An Administrator has invited you to NEXORA.',
            '',
            'Choose your password using this link:',
            config.url.toString(),
            '',
            `The link expires in ${STAFF_INVITATION_MINUTES} minutes.`,
            'Use the newest invitation if you receive another link.',
            'Contact your Administrator if you did not expect this invitation.',
          ].join('\n'),
        });

        return result.accepted.length > 0 &&
          result.rejected.length === 0
          ? 'SMTP_ACCEPTED'
          : 'UNKNOWN';
      } finally {
        transport.close();
      }
    } catch {
      // SMTP failure can occur after the server accepted the email.
      // Preserve the account and report delivery uncertainty.
      return 'UNKNOWN';
    }
  }
}
