import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { DiscordService } from './discord.service';
import { DevanaService } from 'src/devana/devana.service';
import { LinkDto } from './dtos/link.dto';
import { AgentAutocompleteInterceptor } from './dtos/agents.interceptor';
import { UnLinkDto } from './dtos/unlink.dto';
import { DeleteDto } from './dtos/delete.dto';
import { KnowledgeAutocompleteInterceptor } from './dtos/knowledges.interceptor';

@Injectable()
export class DiscordCommands {
  private readonly logger = new Logger(DiscordCommands.name);

  constructor(
    private discordService: DiscordService,
    private devanaService: DevanaService,
  ) {
    this.logger.log('DiscordCommands constructor');
  }

  @UseInterceptors(AgentAutocompleteInterceptor)
  @SlashCommand({
    name: 'link',
    description: 'Link channel to an agent',
  })
  public async onLink(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel, agent, permission }: LinkDto,
  ) {
    this.logger.log('Link command triggered');

    if (!channel) {
      return interaction.reply({
        content: 'You must provide a channel',
        ephemeral: true,
      });
    }

    if (!agent) {
      return interaction.reply({
        content: 'You must provide an agent',
        ephemeral: true,
      });
    }

    const configMessage = await this.discordService.getConfigMessage(
      interaction.guild,
    );

    if (!configMessage) {
      return interaction.reply({
        content: 'You must create a configuration message first',
        ephemeral: true,
      });
    }

    const agents = await this.devanaService.getAgents();

    const agentId = agents.find((a) => a.name === agent)?.id;

    if (!agentId) {
      return interaction.reply({
        content: `Agent ${agent} not found`,
        ephemeral: true,
      });
    }

    const agentExists = configMessage.embeds[0].fields.some(
      (field) => field.name === channel.id,
    );

    if (agentExists) {
      return interaction.reply({
        content: `Channel ${channel} is already linked to an agent`,
        ephemeral: true,
      });
    }

    const embed = configMessage.embeds[0];

    embed.fields.push({
      name: channel.id,
      value: agentId,
    });

    if (permission) {
      embed.fields.push({
        name: `${channel.id}-permission`,
        value: permission.id,
      });
    }

    await configMessage.edit({
      embeds: [embed],
    });

    this.discordService.setConfigMessage(configMessage);

    return interaction.reply({
      content: `Linking channel <#${channel.id}> to agent ${agent}${
        permission ? ` for ${permission.toString()}` : ''
      }`,
      ephemeral: true,
    });
  }

  @SlashCommand({
    name: 'unlink',
    description: 'Unlink channel from an agent',
  })
  public async onUnlink(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: UnLinkDto,
  ) {
    this.logger.log('Unlink command triggered');

    if (!channel) {
      return interaction.reply({
        content: 'You must provide a channel',
        ephemeral: true,
      });
    }

    const configMessage = await this.discordService.getConfigMessage(
      interaction.guild,
    );

    if (!configMessage) {
      return interaction.reply({
        content: 'You must create a configuration message first',
        ephemeral: true,
      });
    }

    const embed = configMessage.embeds[0];

    const agentExists = embed.fields.some((field) => field.name === channel.id);

    if (!agentExists) {
      return interaction.reply({
        content: `Channel ${channel} is not linked to an agent`,
        ephemeral: true,
      });
    }

    const fieldIndex = embed.fields.findIndex((field) =>
      field.name.startsWith(channel.id),
    );

    embed.fields.splice(fieldIndex, 1);

    await configMessage.edit({
      embeds: [embed],
    });

    this.discordService.setConfigMessage(configMessage);

    return interaction.reply({
      content: `Unlinked channel <#${channel.id}>`,
      ephemeral: true,
    });
  }

  @UseInterceptors(AgentAutocompleteInterceptor)
  @UseInterceptors(KnowledgeAutocompleteInterceptor)
  @SlashCommand({
    name: 'delete',
    description: 'Delete an agent or a knowledge base',
  })
  public async onDelete(
    @Context() [interaction]: SlashCommandContext,
    @Options() { agent, knowledgeBase }: DeleteDto,
  ) {
    this.logger.log('Delete command triggered');

    if (!agent && !knowledgeBase) {
      return interaction.reply({
        content: 'You must provide an agent or a knowledge base',
        ephemeral: true,
      });
    }

    if (agent && knowledgeBase) {
      return interaction.reply({
        content: 'You must provide an agent or a knowledge base',
        ephemeral: true,
      });
    }

    if (agent) {
      const agents = await this.devanaService.getAgents();

      const agentId = agents.find((a) => a.name === agent)?.id;

      if (!agentId) {
        return interaction.reply({
          content: `Agent ${agent} not found`,
          ephemeral: true,
        });
      }

      await this.devanaService.deleteAgent(agentId);

      return interaction.reply({
        content: `Agent ${agent} deleted`,
        ephemeral: true,
      });
    }

    if (knowledgeBase) {
      const knowledgeBaseExists = await this.devanaService.getKnowledgeBase(
        knowledgeBase,
      );

      if (!knowledgeBaseExists) {
        return interaction.reply({
          content: `Knowledge base ${knowledgeBase} not found`,
          ephemeral: true,
        });
      }

      await this.devanaService.deleteKnowledgeBase(knowledgeBaseExists.id);

      return interaction.reply({
        content: `Knowledge base ${knowledgeBase} deleted`,
        ephemeral: true,
      });
    }
  }

  @SlashCommand({
    name: 'configuration',
    description: 'Configure the bot',
  })
  public async onConfig(@Context() [interaction]: SlashCommandContext) {
    this.logger.log('Config command triggered');

    const configMessage = await this.discordService.getConfigMessage(
      interaction.guild,
    );

    if (configMessage) {
      await configMessage.delete();
    }

    const message = await interaction.channel.send({
      embeds: [
        new EmbedBuilder({
          title: 'Do not delete.\nDo not unpin.\nDo not edit.',
          description: [
            `This is the configuration message the ${this.discordService.client.user.displayName} bot will use.`,
            'In order to edit this configuration use the context menu on any messages or use commands.',
            '',
            'Context menu :',
            '1. Right click on the message',
            '2. Hover over "Apps"',
            '3. Select "Create agent" or "Create knowledge base"',
            '   - "Create knowledge base" will create a new knowledge base from the messages and the attachments of the message you clicked on.',
            '   - "Create agent" will create a new agent from the aknowledgment message of knowledge base creation automaticaly sent by the bot after the creation of the knowledge base',
            '',
            'Commands :',
            '1. /link',
            '   - This command will link the channel to the agent you want to use.',
            '2. /unlink',
            '   - This command will unlink the channel from the agent.',
            '3. /delete',
            '   - This command will delete either an agent or a knowledge base.',
            '',
            'If you want to edit bot context menu or commands permissions go to Server Settings > Integrations > Devana',
            '',
            'Thanks for using Devana!',
          ].join('\n'),
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
