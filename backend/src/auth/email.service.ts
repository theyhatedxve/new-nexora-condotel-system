import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

export type BookingEmailMessage = {
  to: string;
  subject: string;
  text: string;
  messageId: string;
};

@Injectable()
export class EmailService {
  private configuration() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const username = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;

    if (
      !host || !Number.isInteger(port) || port < 1 || port > 65535 ||
      !username || !password || !from
    ) {
      throw new Error('Email delivery is not configured.');
    }
    return { host, port, username, password, from };
  }

  private transport(config: ReturnType<EmailService['configuration']>) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.username, pass: config.password },
      requireTLS: config.port !== 465,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }

  assertBookingDeliveryConfigured(): void {
    this.configuration();
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const config = this.configuration();
    const verificationUrl = process.env.AUTH_VERIFY_URL;
    if (!verificationUrl) {
      throw new Error('Email delivery is not configured.');
    }
    const url = new URL(verificationUrl);
    if (url.username || url.password || url.search || url.hash) {
      throw new Error('Invalid verification URL configuration.');
    }
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error('Production email verification requires HTTPS.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid verification URL protocol.');
    }
    url.searchParams.set('token', token);
    const transport = this.transport(config);
    try {
      await transport.sendMail({
        from: config.from,
        to: email,
        subject: 'Verify your NEXORA account',
        text: [
          'Welcome to NEXORA.',
          '',
          'Verify your email address using this link:',
          url.toString(),
          '',
          'The link expires in 30 minutes.',
          'If you did not register, you can ignore this message.',
        ].join('\n'),
      });
    } finally {
      transport.close();
    }
  }

  async sendBookingConfirmation(
    message: BookingEmailMessage,
  ): Promise<'SMTP_ACCEPTED' | 'UNKNOWN'> {
    try {
      const config = this.configuration();
      const transport = this.transport(config);
      try {
        const result = await transport.sendMail({
          from: config.from,
          to: { address: message.to, name: '' },
          subject: message.subject,
          text: message.text,
          messageId: message.messageId,
        });
        return result.accepted.length > 0 && result.rejected.length === 0
          ? 'SMTP_ACCEPTED' : 'UNKNOWN';
      } finally {
        transport.close();
      }
    } catch {
      return 'UNKNOWN';
    }
  }
}
