import { ChannelType, ForumChannel, TextChannel } from 'discord.js';

export type SupportedChannel = TextChannel | ForumChannel;
export const supportedChannelType = [
  ChannelType.GuildText,
  ChannelType.GuildForum,
];
