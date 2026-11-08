import { InboxjotEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, IConfigurations, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class InboxjotHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.Inboxjot, ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials & IConfigurations, from?: string) {
    this.provider = new InboxjotEmailProvider({
      from: from as string,
      apiKey: credentials.apiKey as string,
      senderName: credentials.senderName,
    });
  }
}
