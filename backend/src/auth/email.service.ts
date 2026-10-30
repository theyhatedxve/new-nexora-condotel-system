
import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  async sendVerificationEmail(
    email: string,
    token: string,
  ): Promise<void> {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const username = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;
    const verificationUrl = process.env.AUTH_VERIFY_URL;

    if (
      !host ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !username ||
      !password ||
      !from ||
      !verificationUrl
    ) {
      throw new Error('Email delivery is not configured.');
    }

    const url = new URL(verificationUrl);

    if (url.username || url.password || url.search || url.hash) {
      throw new Error('Invalid verification URL configuration.');
    }

    if (
      process.env.NODE_ENV === 'production' &&
      url.protocol !== 'https:'
    ) {
      throw new Error('Production email verification requires HTTPS.');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid verification URL protocol.');
    }

    url.searchParams.set('token', token);

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: username,
        pass: password,
      },
      requireTLS: port !== 465,
    });

    try {
      await transport.sendMail({
        from,
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
}
