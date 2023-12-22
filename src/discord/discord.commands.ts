import { Injectable, Logger } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { DiscordService } from './discord.service';
import { DevanaService } from 'src/devana/devana.service';

@Injectable()
export class DiscordCommands {
  private readonly logger = new Logger(DiscordCommands.name);

  constructor(
    private discordService: DiscordService,
    private devanaService: DevanaService,
  ) {
    this.logger.log('DiscordCommands constructor');
  }

  @SlashCommand({
    name: 'configuration',
    description: 'Configure the bot',
  })
  public async config(@Context() [interaction]: SlashCommandContext) {
    this.logger.log('Config command triggered');
    this.logger.log(interaction);

    const configMessage = await this.discordService.getConfigMessage(
      interaction.guild,
    );

    if (configMessage) {
      await configMessage.delete();
    }

    const channels = (
      interaction.guild.channels.cache ||
      (await interaction.guild.channels.fetch())
    ).filter(
      (channel) =>
        channel.isTextBased() && channel.type === ChannelType.GuildText,
    );

    const models = await this.devanaService.getAgents();

    const message = await interaction.channel.send({
      embeds: [
        new EmbedBuilder({
          title: 'Do not delete.',
          description: `This is the configuration message the ${this.discordService.client.user.displayName} bot will use.\nYou can edit this configurations by using the **buttons below**.`,
          author: {
            name: 'Devana configuration',
          },
          fields: [
            {
              name: 'configuration',
              value: `${interaction.channel.id}`,
            },
          ],
        }),
      ],
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>({
          components: [
            new ButtonBuilder({
              customId: 'create-knowledge',
              label: 'Create knowledge base!',
              emoji: '🤯',
              style: ButtonStyle.Primary,
            }),
            new ButtonBuilder({
              customId: 'create-agent',
              label: 'Create agent!',
              emoji: '🎉',
              style: ButtonStyle.Primary,
            }),
            new ButtonBuilder({
              customId: 'link-channel',
              label: 'Link channel to agent!',
              emoji: '🤖',
              style: ButtonStyle.Primary,
            }),
          ],
        }),
        new ActionRowBuilder<MessageActionRowComponentBuilder>({
          components: [
            new ButtonBuilder({
              customId: 'delete-knowledge',
              label: 'Delete knowledge base',
              emoji: '🗑️',
              style: ButtonStyle.Secondary,
            }),
            new ButtonBuilder({
              customId: 'delete-agent',
              label: 'Delete agent',
              emoji: '🔫',
              style: ButtonStyle.Secondary,
            }),
            new ButtonBuilder({
              customId: 'unlink-channel',
              label: 'Unlink channel',
              emoji: '❌',
              style: ButtonStyle.Secondary,
            }),
          ],
        }),
        /* new ActionRowBuilder<MessageActionRowComponentBuilder>({
          components: [
            new StringSelectMenuBuilder({
              customId: 'model',
              placeholder: 'Which AI this channel should use?',
              options: models.map((model) => ({
                label: model.name,
                value: model.id,
              })),
            }),
          ],
        }),
        new ActionRowBuilder<MessageActionRowComponentBuilder>({
          components: [
            new StringSelectMenuBuilder({
              customId: 'channel',
              placeholder: 'Which channel this AI should use?',
              options: channels.map((channel) => ({
                label: channel.name,
                value: channel.id,
              })),
            }),
          ],
        }),
        new ActionRowBuilder<MessageActionRowComponentBuilder>({
          components: [
            new ButtonBuilder({
              customId: 'save',
              label: 'Save',
              style: ButtonStyle.Primary,
            }),
          ],
        }), */
      ],
    });

    await message.pin('Pin is mandatory to find configuration later.');

    const lmessage = await interaction.channel.messages.fetch({
      limit: 1,
    });

    lmessage.last().delete();

    return interaction.reply({
      content: 'Configuration message created!',
      ephemeral: true,
    });
  }
}
