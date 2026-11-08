import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { Inboxjot, InboxjotError, SendEmailOptions } from 'inboxjot';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class InboxjotEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.Inboxjot;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private inboxjot: Inboxjot;

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName?: string;
    }
  ) {
    super();
    this.inboxjot = new Inboxjot({ apiKey: this.config.apiKey });
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName || this.config.senderName;
    const fromAddress = options.from || this.config.from;

    const body = this.transform<SendEmailOptions>(bridgeProviderData, {
      from: senderName ? `${senderName} <${fromAddress}>` : fromAddress,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      reply_to: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      headers: options.headers,
      attachments: options.attachments
        ?.filter((attachment) => attachment.file)
        .map((attachment) => ({
          filename: attachment.name ?? 'attachment',
          content: (attachment.file as Buffer).toString('base64'),
          content_type: attachment.mime,
          content_id: attachment.cid,
        })),
    } satisfies SendEmailOptions).body;

    // Novu's message id makes retries safe: Inboxjot replays the first response for a repeated key.
    const response = await this.inboxjot.emails.send(body, { idempotencyKey: options.id });

    return {
      id: response.id,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      await this.sendMessage(options);

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      const isBadCredentials = error instanceof InboxjotError && error.status === 401;

      return {
        success: false,
        message: error?.message,
        code: isBadCredentials ? CheckIntegrationResponseEnum.BAD_CREDENTIALS : CheckIntegrationResponseEnum.FAILED,
      };
    }
  }
}
