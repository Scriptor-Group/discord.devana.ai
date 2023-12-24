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
    this.logger.log('DiscordCommands initiated');
  }

  // This command is used to create a knowledge base from a message
  @UseInterceptors(AgentAutocompleteInterceptor)
  @SlashCommand({
    name: 'link',
    description: 'Link channel to an agent',
    // TODO: Set default permissions to admin only
  })
  public async onLink(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel, agent, permission }: LinkDto,
  ) {
    this.logger.log(`[/link] ${interaction.user.username}`);

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

    // Get the config message of the guild
    const configMessage = await this.discordService.getConfigMessage(
      interaction.guild,
    );

    if (!configMessage) {
      return interaction.reply({
        content: 'You must create a configuration message first',
        ephemeral: true,
      });
    }

    // Get the agents from Devana
    const agents = await this.devanaService.getAgents();

    // Find the agent id from the agent name
    const agentId = agents.find((a) => a.name === agent)?.id;

    if (!agentId) {
      return interaction.reply({
        content: `Agent ${agent} not found`,
        ephemeral: true,
      });
    }

    // Check if the channel is already linked to an agent
    const agentExists = configMessage.embeds[0].fields.some(
      (field) => field.name === channel.id,
    );

    if (agentExists) {
      return interaction.reply({
        content: `Channel ${channel} is already linked to an agent`,
        ephemeral: true,
      });
    }

    // Modifying the embed of the config message to add the
    // channel id and the agent id in order to check later if
    // the channel is linked to an agent
    const embed = configMessage.embeds[0];

    embed.fields.push({
      name: channel.id,
      value: agentId,
    });

    // If a permission is provided, add it to the embed
    if (permission) {
      embed.fields.push({
        name: `${channel.id}-permission`,
        value: permission.id,
      });
    }

    // Edit the config message with the new embed
    await configMessage.edit({
      embeds: [embed],
    });
    // This is used to have a cache of the config message
    // in order to not refetch it every time
    this.discordService.setConfigMessage(configMessage);

    return interaction.reply({
      content: `Linking channel <#${channel.id}> to agent ${agent}${
        permission ? ` for ${permission.toString()}` : ''
      }`,
      ephemeral: true,
    });
  }

  // This command is used to unlink a channel from an agent
  @SlashCommand({
    name: 'unlink',
    description: 'Unlink channel from an agent',
    // TODO: Set default permissions to admin only
  })
  public async onUnlink(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: UnLinkDto,
  ) {
    this.logger.log(`[/unlink] ${interaction.user.username}`);

    if (!channel) {
      return interaction.reply({
        content: 'You must provide a channel',
        ephemeral: true,
      });
    }

    // Get the config message of the guild
    const configMessage = await this.discordService.getConfigMessage(
      interaction.guild,
    );

    if (!configMessage) {
      return interaction.reply({
        content: 'You must create a configuration message first',
        ephemeral: true,
      });
    }

    // Check if the channel is linked to an agent
    const embed = configMessage.embeds[0];

    const agentExists = embed.fields.some((field) => field.name === channel.id);

    if (!agentExists) {
      return interaction.reply({
        content: `Channel ${channel} is not linked to an agent`,
        ephemeral: true,
      });
    }

    // Remove the channel id from the embed
    // in order to check later if the channel is linked to an agent
    const fieldIndex = embed.fields.findIndex((field) =>
      field.name.startsWith(channel.id),
    );

    embed.fields.splice(fieldIndex, 1);

    // Edit the config message with the new embed
    await configMessage.edit({
      embeds: [embed],
    });
    // This is used to have a cache of the config message
    // in order to not refetch it every time
    this.discordService.setConfigMessage(configMessage);

    return interaction.reply({
      content: `Unlinked channel <#${channel.id}>`,
      ephemeral: true,
    });
  }

  // This command is used to delete an agent or a knowledge base
  // We use interceptors to autocomplete the agent and knowledge base names
  @UseInterceptors(AgentAutocompleteInterceptor)
  @UseInterceptors(KnowledgeAutocompleteInterceptor)
  @SlashCommand({
    name: 'delete',
    description: 'Delete an agent or a knowledge base',
    // TODO: Set default permissions to admin only
  })
  public async onDelete(
    @Context() [interaction]: SlashCommandContext,
    @Options() { agent, knowledgeBase }: DeleteDto,
  ) {
    this.logger.log(`[/delete] ${interaction.user.username}`);

    // If none are provided we dont want to execute the command
    if (!agent && !knowledgeBase) {
      return interaction.reply({
        content: 'You must provide an agent or a knowledge base',
        ephemeral: true,
      });
    }

    // If both are provided we dont want to execute the command
    if (agent && knowledgeBase) {
      return interaction.reply({
        content: 'You must provide an agent or a knowledge base',
        ephemeral: true,
      });
    }

    if (agent) {
      // Get all the agents to check if the agent exists
      // TODO: check if current agent is linked to the channel
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
      // Get the knowledge base to check if it exists and use his datas
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

  // This command is used to create a configuration message
  @SlashCommand({
    name: 'configuration',
    description: 'Configure the bot',
    // TODO: Set default permissions to admin only
  })
  public async onConfig(@Context() [interaction]: SlashCommandContext) {
    this.logger.log(`[/configuration] ${interaction.user.username}`);

    // Get the config message of the guild
    const configMessage = await this.discordService.getConfigMessage(
      interaction.guild,
    );

    // If the config message exists we delete it
    // We do that to prevent any errors further in the code
    // We could cancel this but if the users wants to change channel
    // We need to delete the old one
    if (configMessage) {
      await configMessage.delete();
    }

    // Create the config message
    // This message contains the how to use
    // We could see later if we want this in an another command
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

    // We pin the message in order to find it more easily
    // (quite literaly without fetching all the messages from the guild)
    await message.pin('Pin is mandatory to find configuration later.');

    const lmessage = await interaction.channel.messages.fetch({
      limit: 1,
    });

    // We delete the pinned message (u know the thing that says "Successfully pinned message")
    lmessage.last().delete();

    return interaction.reply({
      content: 'Configuration message created!',
      ephemeral: true,
    });
  }
}
