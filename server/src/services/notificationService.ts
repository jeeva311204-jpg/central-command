import nodemailer from 'nodemailer';
import { prisma } from '../db';
import { config } from '../config';

// Lazy-initialized Nodemailer transporter
let transporter: any = null;

function getMailTransporter(): any {
  if (transporter) return transporter;

  if (config.smtpHost && config.smtpUser) {
    try {
      transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });
      console.log(`📧 Nodemailer SMTP Transporter initialized with host: ${config.smtpHost}:${config.smtpPort}`);
    } catch (err) {
      console.warn('⚠️ Could not initialize SMTP transporter, falling back to simulated log:', err);
      transporter = null;
    }
  }

  return transporter;
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'APPROVAL' | 'ESCALATION' | 'SLA_WARNING' | 'WARRANTY' | 'MAINTENANCE' | 'AUDIT' | 'SYSTEM' = 'SYSTEM',
  linkUrl?: string
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        linkUrl,
      },
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
}

/**
 * Sends real email via Nodemailer if SMTP is configured, and always stores
 * in SimulatedEmail database log for guaranteed auditability & offline demos.
 */
export async function sendEmailNotification(
  toEmail: string,
  recipientName: string,
  subject: string,
  bodyHtml: string,
  category: 'APPROVAL_REQUEST' | 'SLA_ESCALATION' | 'REVISION_REQUEST' | 'PO_ISSUED' | 'WARRANTY_ALERT' | 'MAINTENANCE_ALERT'
) {
  let realEmailSent = false;
  let realEmailError: string | null = null;

  const mailTransporter = getMailTransporter();
  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: `"${config.smtpFrom || 'ChangeFlow Enterprise'}" <${config.smtpUser || 'no-reply@changeflow.enterprise'}>`,
        to: `"${recipientName}" <${toEmail}>`,
        subject,
        html: bodyHtml,
      });
      realEmailSent = true;
      console.log(`📧 [Nodemailer] Successfully delivered real email to ${toEmail} (${subject})`);
    } catch (err: any) {
      realEmailError = err.message || 'SMTP transmission failure';
      console.warn(`⚠️ [Nodemailer] SMTP send failed to ${toEmail}, preserved in simulated log:`, err.message);
    }
  }

  // Always persist in database simulated email log for offline demo inspection and audit trail
  try {
    const savedLog = await prisma.simulatedEmail.create({
      data: {
        toEmail,
        recipientName,
        subject,
        bodyHtml: realEmailSent ? `${bodyHtml}<br/><small style="color:green;">[Delivered via SMTP]</small>` : bodyHtml,
        category,
      },
    });

    return {
      log: savedLog,
      realEmailSent,
      realEmailError,
    };
  } catch (err) {
    console.error('Failed to record email log:', err);
    return null;
  }
}

// Backward-compatible alias
export const sendSimulatedEmail = sendEmailNotification;
