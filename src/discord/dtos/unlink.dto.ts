import { ChannelType } from 'discord.js';
import { ChannelOption } from 'necord';
import { SupportedChannel } from 'src/types/devana';

export class UnLinkDto {
  @ChannelOption({
    name: 'channel',
    description: 'Channel to unlink',
    channel_types: [ChannelType.GuildText, ChannelType.GuildForum],
    required: true,
  })
  channel: SupportedChannel;
}
