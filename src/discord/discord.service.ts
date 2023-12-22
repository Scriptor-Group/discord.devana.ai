import { Injectable } from '@nestjs/common';
import { Client, Guild } from 'discord.js';

@Injectable()
export class DiscordService {
  public client: Client;

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

    return messages.find((message) => message);
  }
}
