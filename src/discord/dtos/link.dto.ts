import { ChannelType, GuildMember, Role, User } from 'discord.js';
import { ChannelOption, MentionableOption, StringOption } from 'necord';
import { SupportedChannel } from 'src/types/devana';

export class LinkDto {
  @ChannelOption({
    name: 'channel',
    description: 'Channel to link',
    channel_types: [ChannelType.GuildText, ChannelType.GuildForum],
    required: true,
  })
  channel: SupportedChannel;

  @StringOption({
    name: 'agent',
    description: 'Agent to link',
    autocomplete: true,
    required: true,
  })
  agent: string;

  @MentionableOption({
    name: 'permission',
    description: '(optional) Permissions for user to use the agent',
    required: false,
  })
  permission: User | Role | GuildMember;
}
