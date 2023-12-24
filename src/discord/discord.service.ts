import { Injectable } from '@nestjs/common';
import { Client, Guild, Message, TextChannel } from 'discord.js';
import { DevanaService } from 'src/devana/devana.service';
import { SupportedChannel } from 'src/types/devana';

@Injectable()
export class DiscordService {
  private configMessage: {
    [key: string]: Message;
  } = {};
  public client: Client;

  constructor(private devanaService: DevanaService) {}

  public async getConfigMessage(guild: Guild) {
    const channels = guild.channels.cache || (await guild.channels.fetch());
    const messages = await Promise.all(
      channels.map(async (channel) => {
        if (!channel.isTextBased()) return;

        const messages = await channel.messages.fetchPinned();

        return messages.find(
          (message) =>
            message.author.id === this.client.user.id &&
            message.embeds.some(
              (embed) => embed.author.name === 'Devana configuration',
            ),
        );
      }),
    );

    const configMessage = messages.find((message) => message);

    if (configMessage) this.configMessage[guild.id] = configMessage;

    return configMessage;
  }

  public async setConfigMessage(message: Message) {
    this.configMessage[message.guild.id] = message;
    return true;
  }

  public replaceMention(message: Message) {
    return message.content.replace(/<(@|#)(.*)>/g, (match, type, id) => {
      switch (type) {
        case '@':
          return (
            message.mentions.users.find((u) => u.id === id).username ||
            message.mentions.members.find((m) => m.id === id).user.username ||
            message.mentions.roles.find((r) => r.id === id).name ||
            message.mentions.members.find((m) => m.id === id).nickname
          );
        case '#':
          return (
            message.mentions.channels.find((c) => c.id === id) as TextChannel
          ).name;
        default:
          return match;
      }
    });
  }

  public getChannelAgent(channel: SupportedChannel) {
    const configMessage = this.configMessage[channel.guild.id];

    if (!configMessage) return;

    console.log(channel.parentId);

    const agent = configMessage.embeds[0].fields.find(
      (field) => field.name === channel.id || field.name === channel.parentId,
    )?.value;

    return agent;
  }
}
