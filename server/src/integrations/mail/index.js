import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';

/**
 * Mailer abstraction. `console` driver (default) logs the message — used in dev
 * and tests so password-reset links are visible without an SMTP server. `smtp`
 * driver sends for real.
 */
class ConsoleMailer {
  async send({ to, subject, text }) {
    logger.info(`[mail:console] To: ${to} | Subject: ${subject}\n${text}`);
    return { accepted: [to], driver: 'console' };
  }
}

class SmtpMailer {
  constructor(smtp, from) {
    this.from = from;
    this.transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    });
  }

  async send({ to, subject, text, html }) {
    return this.transport.sendMail({ from: this.from, to, subject, text, html });
  }
}

let instance = null;

export function getMailer() {
  if (instance) return instance;
  instance =
    config.mail.driver === 'smtp'
      ? new SmtpMailer(config.mail.smtp, config.mail.from)
      : new ConsoleMailer();
  return instance;
}

export default getMailer;
