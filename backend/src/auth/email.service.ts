import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { requireAuthRealmOrigin } from './auth-realm.config.js';

export type BookingEmailMessage = {
  to: string;
  subject: string;
  text: string;
  messageId: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

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
    let stage: 'SMTP configuration' | 'verification URL configuration' | 'SMTP' =
      'SMTP configuration';
    try {
      const config = this.configuration();
      stage = 'verification URL configuration';
      const url = this.verificationLink(token);
      stage = 'SMTP';
      await this.deliverVerificationEmail(email, config, url);
    } catch (error) {
      const category = stage === 'SMTP' ? this.smtpFailureCategory(error) : stage;
      // Provider error details can contain credentials, addresses, or message content.
      this.logger.warn(`Guest verification email failed (${category}).`);
      throw error;
    }
  }

  private smtpFailureCategory(error: unknown): string {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined;
    switch (code) {
      case 'EAUTH':
        return 'authentication';
      case 'ETLS':
        return 'tls';
      case 'ECONNECTION':
      case 'ETIMEDOUT':
      case 'ESOCKET':
      case 'EDNS':
      case 'ECONNREFUSED':
      case 'ECONNRESET':
        return 'connection';
      case 'EENVELOPE':
      case 'EMESSAGE':
        return 'message rejected';
      default:
        return 'unknown';
    }
  }

  private verificationLink(token: string): URL {
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
    return url;
  }

  private async deliverVerificationEmail(
    email: string,
    config: ReturnType<EmailService['configuration']>,
    url: URL,
  ): Promise<void> {
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

  async sendGuestCredentialEmail(
    email: string, token: string, purpose: 'RESET_PASSWORD' | 'CHANGE_EMAIL',
  ): Promise<void> {
    const config = this.configuration();
    const verificationUrl = process.env.AUTH_VERIFY_URL;
    if (!verificationUrl) throw new Error('Email delivery is not configured.');
    const base = new URL(verificationUrl);
    if (base.username || base.password || base.search || base.hash ||
        !['http:', 'https:'].includes(base.protocol) ||
        (process.env.NODE_ENV === 'production' && base.protocol !== 'https:')) {
      throw new Error('Invalid guest email URL configuration.');
    }
    // Build links from trusted configuration, never a request's Host header.
    requireAuthRealmOrigin('guest', base.origin);
    const reset = purpose === 'RESET_PASSWORD';
    const url = new URL(reset ? '/reset-password' : '/confirm-email', base);
    // Fragments are not sent to the web server or included in Referer headers.
    url.hash = new URLSearchParams({ token }).toString();
    const transport = this.transport(config);
    try {
      const result = await transport.sendMail({
        from: config.from, to: { address: email, name: '' },
        subject: reset ? 'Reset your NEXORA password' : 'Confirm your new NEXORA sign-in email',
        text: [
          reset ? 'Use this link to choose a new NEXORA password:' : 'Confirm this address as your new NEXORA sign-in email:',
          '', url.toString(), '', 'The link expires in 30 minutes and can only be used once.',
          'Confirming this change signs out existing sessions.',
          'If you did not request this change, ignore this message. Your account will not change.',
        ].join('\n'),
      });
      if (!result.accepted.length || result.rejected.length) throw new Error('Email was not accepted.');
    } finally { transport.close(); }
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
