import { CheckIntegrationResponseEnum, IEmailOptions } from '@novu/stateless';
import { InboxjotError } from 'inboxjot';
import { expect, test, vi } from 'vitest';
import { InboxjotEmailProvider } from './inboxjot.provider';

const mockConfig = {
  apiKey: 'ij_test_key',
  from: 'hello@acme.dev',
  senderName: 'Acme',
};

const mockNovuMessage: IEmailOptions = {
  id: 'message-id',
  to: ['riti@example.com'],
  cc: ['kamran@example.com'],
  subject: 'Test subject',
  html: '<img src="cid:logo" />',
  text: 'Mail content',
  replyTo: 'support@acme.dev',
  headers: { 'X-Campaign': 'welcome' },
  attachments: [{ mime: 'image/png', file: Buffer.from('test'), name: 'logo.png', cid: 'logo' }],
};

function mockSend(provider: InboxjotEmailProvider) {
  return vi.spyOn((provider as any).inboxjot.emails, 'send').mockResolvedValue({ id: 'eml_123' });
}

test('should send the email through the Inboxjot API', async () => {
  const provider = new InboxjotEmailProvider(mockConfig);
  const spy = mockSend(provider);

  const response = await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalledWith(
    {
      from: 'Acme <hello@acme.dev>',
      to: ['riti@example.com'],
      cc: ['kamran@example.com'],
      bcc: undefined,
      reply_to: 'support@acme.dev',
      subject: 'Test subject',
      html: '<img src="cid:logo" />',
      text: 'Mail content',
      headers: { 'X-Campaign': 'welcome' },
      attachments: [{ filename: 'logo.png', content: 'dGVzdA==', content_type: 'image/png', content_id: 'logo' }],
    },
    { idempotencyKey: 'message-id' }
  );
  expect(response.id).toBe('eml_123');
});

test('should snake case the bridge provider data', async () => {
  const provider = new InboxjotEmailProvider(mockConfig);
  const spy = mockSend(provider);

  await provider.sendMessage(
    { ...mockNovuMessage, from: 'news@acme.dev', senderName: undefined },
    { scheduledAt: '2026-12-01T09:00:00Z', tags: [{ name: 'category', value: 'welcome' }] }
  );

  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({
      from: 'Acme <news@acme.dev>',
      scheduled_at: '2026-12-01T09:00:00Z',
      tags: [{ name: 'category', value: 'welcome' }],
    }),
    { idempotencyKey: 'message-id' }
  );
});

test('should report bad credentials when Inboxjot rejects the API key', async () => {
  const provider = new InboxjotEmailProvider(mockConfig);
  vi.spyOn((provider as any).inboxjot.emails, 'send').mockRejectedValue(
    new InboxjotError(
      { name: 'unauthorized', status: 401, message: 'Invalid API key', errors: [], request_id: null },
      new Headers()
    )
  );

  const response = await provider.checkIntegration(mockNovuMessage);

  expect(response).toEqual({
    success: false,
    message: 'Invalid API key',
    code: CheckIntegrationResponseEnum.BAD_CREDENTIALS,
  });
});
