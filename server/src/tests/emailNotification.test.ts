import { describe, it, expect, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { prisma } from '../db';
import { sendEmailNotification } from '../services/notificationService';

describe('Item 7: Email Notification System (Nodemailer + Fallback Log)', () => {
  it('falls back to simulated database log when SMTP is unconfigured', async () => {
    const testRecipient = 'rajesh.hod@changeflow.com';
    const testSubject = `[ChangeFlow Test Approval] CF-2026-TEST-${Date.now()}`;
    const testBody = '<p>Please approve the CNC Machine purchase.</p>';

    const result = await sendEmailNotification(
      testRecipient,
      'Rajesh Sharma',
      testSubject,
      testBody,
      'APPROVAL_REQUEST'
    );

    expect(result).not.toBeNull();
    expect(result?.log).toBeDefined();
    expect(result?.log.toEmail).toBe(testRecipient);
    expect(result?.log.subject).toBe(testSubject);

    // Verify stored in prisma database
    const saved = await prisma.simulatedEmail.findUnique({
      where: { id: result?.log.id },
    });
    expect(saved).not.toBeNull();
    expect(saved?.category).toBe('APPROVAL_REQUEST');
  });

  it('attempts SMTP delivery via Nodemailer and falls back gracefully on network error', async () => {
    const sendMailSpy = vi.fn().mockRejectedValue(new Error('Connection refused to SMTP server:587'));
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: sendMailSpy,
    } as any);

    const testSubject = `[ChangeFlow SLA Escalation] CF-2026-ESC-${Date.now()}`;
    const result = await sendEmailNotification(
      'director@changeflow.com',
      'Aditya Birla',
      testSubject,
      '<p>Escalation notice for breach of SLA</p>',
      'SLA_ESCALATION'
    );

    // Persisted in log despite network/SMTP failure
    expect(result?.log).toBeDefined();
    expect(result?.log.subject).toBe(testSubject);
    expect(result?.realEmailSent).toBe(false);

    vi.restoreAllMocks();
  });
});
