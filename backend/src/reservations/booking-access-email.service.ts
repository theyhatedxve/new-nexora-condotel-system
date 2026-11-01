import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

import {
  getAllowedOrigins,
} from '../auth/auth.config.js';

@Injectable()
export class BookingAccessEmailService {
  async send(
    email: string,
    token: string,
  ): Promise<void> {
    const base = process.env.BOOKING_ACCESS_URL;
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;

    if (
      !base ||
      !host ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !user ||
      !pass ||
      !from
    ) {
      throw new Error(
        'Booking access email is not configured.',
      );
    }

    const url = new URL(base);

    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !['http:', 'https:'].includes(url.protocol) ||
      !getAllowedOrigins().includes(url.origin) ||
      (
        process.env.NODE_ENV === 'production' &&
        url.protocol !== 'https:'
      )
    ) {
      throw new Error(
        'Invalid booking access URL.',
      );
    }

    // Fragments are not sent to web servers
    // as part of HTTP requests.
    url.hash = new URLSearchParams({
      token,
    }).toString();

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      requireTLS: port !== 465,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });

    try {
      await transport.sendMail({
        from,
        to: email,
        subject: 'Access your NEXORA booking',
        text: [
          'Use this private link to view your NEXORA booking:',
          url.toString(),
          '',
          'The link expires in 15 minutes and can be used once.',
          'Open the page, then select View my booking.',
          'Do not forward this link.',
          'If you did not request it, ignore this message.',
        ].join('\n'),
      });
    } finally {
      transport.close();
    }
  }
}