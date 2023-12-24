import { Injectable } from '@nestjs/common';
import { Client, Guild, Message, TextChannel } from 'discord.js';
import { SupportedChannel } from 'src/types/devana';

@Injectable()
export class DiscordService {
  // TODO: use redis to store config message
  // Config message is cached in memory because it is used frequently
  // and it is not worth it to query the discord api every time
  private configMessage: {
    [key: string]: Message;
  } = {};
  public client: Client;

  /**
   * Get the configuration message from a guild
   * @param guild String Guild id
   * @returns Promise<Message>
   */
  public async getConfigMessage(guild: Guild) {
    const channels = guild.channels.cache || (await guild.channels.fetch());
    // We map all the pinned messages to get the configuration one
    const messages = await Promise.all(
      channels.map(async (channel) => {
        if (!channel.isTextBased()) return;

        const messages = await channel.messages.fetchPinned();

        return messages.find(
          (message) =>
            message.author.id === this.client.user.id &&
            message.embeds.some(
              // The author name is used to identify the configuration message
              (embed) => embed.author.name === 'Devana configuration',
            ),
        );
      }),
    );

    const configMessage = messages.find((message) => message);

    // Here's the cache mentioned earlier
    if (configMessage) this.configMessage[guild.id] = configMessage;

    return configMessage;
  }

  /**
   * Set the configuration message for a guild
   * @param message Message
   * @returns Promise<boolean>
   */
  public async setConfigMessage(message: Message) {
    this.configMessage[message.guild.id] = message;
    return true;
  }

  /**
   * Replace the mentions in a message (parse it)
   * @param message Message
   * @returns string
   */
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

  /**
   * Get the agent id from a channel
   * @param channel TextChannel
   * @returns string
   */
  public getChannelAgent(channel: SupportedChannel) {
    const configMessage = this.configMessage[channel.guild.id];

    if (!configMessage) return;

    const agent = configMessage.embeds[0].fields.find(
      // We check parentId too because thread channels are child channels
      // and we want to get the agent from the parent channel
      (field) => field.name === channel.id || field.name === channel.parentId,
    )?.value;

    return agent;
  }
}
