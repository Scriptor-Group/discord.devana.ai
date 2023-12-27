import { Injectable, Logger } from '@nestjs/common';
import {
  ActionRowBuilder,
  Message,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  Context,
  MessageCommand,
  MessageCommandContext,
  TargetMessage,
} from 'necord';
import { DiscordService } from './discord.service';
import { DevanaService } from 'src/devana/devana.service';
import { I18nService } from 'src/i18n/i18n.service';
import { ConfigService } from '@nestjs/config';

// A context is a class used to handle the context menu commands
@Injectable()
export class DiscordContext {
  private readonly logger = new Logger(DiscordContext.name);

  constructor(
    private discordService: DiscordService,
    private devanaService: DevanaService,
    private configService: ConfigService,
    private i18n: I18nService,
  ) {
    this.logger.log('DiscordContext initiated');
  }

  // Create Knowledge base context menu command is used to create a new knowledge base from a message
  @MessageCommand({
    name: 'Create knowledge base',
    defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  })
  public async createKnowledgeBaseFromMessage(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    // Quite straightforward, check if the targeted message is from the bot
    if (message.author.id === this.discordService.client.user.id)
      return interaction.reply({
        content: this.i18n.t(
          'en',
          'discord.context.create_knowledge.OWN_MESSAGE_ERROR',
        ),
      });

    // We let the user know that we are creating the knowledge base
    // this is set because it can take quite a while
    interaction.reply({
      content: this.i18n.t(
        'en',
        'discord.context.create_knowledge.LOADING_CREATE_KNOWLEDGE',
      ),
      ephemeral: true,
    });

    // Here we use a default Devana AI to ask it to get a short description
    // of the message content, it will be used as the knowledge base name
    const question = await this.devanaService.askAgent(
      this.configService.get('DEVANA_AGENT_BASE'),
      encodeURIComponent(
        `Define the following text in maximum two words without using special characters : "${message.content}"`,
      ),
    );

    // Here u go we create the knowledge base me lord
    const knowledgeBase = await this.devanaService.createKnowledgeBase(
      question.text,
      message.content,
      message.attachments,
    );

    return interaction.channel.send({
      embeds: [
        {
          url: `https://app.devana.ai/account/knowledge/${knowledgeBase.id}`,
          title: this.i18n.t(
            'en',
            'discord.context.create_knowledge.EMBED_CREATED_TITLE',
          ),
          description: this.i18n.t(
            'en',
            'discord.context.create_knowledge.EMBED_CREATED_DESCRIPTION',
            knowledgeBase.name,
          ),
          fields: [
            {
              name: 'knowledge-id',
              value: knowledgeBase.id,
            },
          ],
        },
      ],
    });
  }

  // Create Agent context menu command is used to create a new agent from a knowledge base message
  @MessageCommand({
    name: 'Create agent',
    defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  })
  public async createAgentFromMessage(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    // Check if the targeted message is from the bot
    // and check if the targeted message has a knowledge-id field
    // this will tell us if the targeted message is a knowledge base message
    if (
      message.author.id !== this.discordService.client.user.id &&
      !message.embeds.some((embed) =>
        embed.fields.some((field) => field.name === 'knowledge-id'),
      )
    )
      return interaction.reply({
        content: this.i18n.t(
          'en',
          'discord.context.create_agent.OWN_MESSAGE_ERROR',
        ),
        ephemeral: true,
      });

    /* // We let the user know that we are creating the agent
    interaction.reply({
      content: this.i18n.t(
        'en',
        'discord.context.create_agent.LOADING_CREATE_AGENT',
      ),
      ephemeral: true,
    }); */

    // Get the knowledge base id from the targeted message and use it to get
    // the knowledge base from the devana api
    const knowledgeBaseId = message.embeds
      .find((embed) =>
        embed.fields.some((field) => field.name === 'knowledge-id'),
      )
      .fields.find((field) => field.name === 'knowledge-id').value;

    const knowledgeBase = await this.devanaService.getKnowledgeBase(
      knowledgeBaseId,
    );

    if (!knowledgeBase)
      return interaction.reply({
        content: this.i18n.t(
          'en',
          'discord.context.create_agent.KNOWLEDGE_NOT_FOUND',
        ),
        ephemeral: true,
      });

    const modal = new ModalBuilder({
      customId: `agent/${knowledgeBaseId}`,
      title: 'Agent creation',
      components: [
        new ActionRowBuilder<ModalActionRowComponentBuilder>({
          components: [
            new TextInputBuilder({
              customId: 'name',
              placeholder: 'Agent name (optional)',
              label: 'Agent name',
              value: knowledgeBase.name,
              style: TextInputStyle.Short,
              required: true,
            }),
          ],
        }),
        new ActionRowBuilder<ModalActionRowComponentBuilder>({
          components: [
            new TextInputBuilder({
              customId: 'description',
              placeholder: [
                'This agent will get data from the internet and must use Mistral model.',
                'He will make coffee ☕',
                'etc...',
              ].join('\n'),
              label: 'Describe the agent',
              style: TextInputStyle.Paragraph,
              required: false,
            }),
          ],
        }),
        new ActionRowBuilder<ModalActionRowComponentBuilder>({
          components: [
            new TextInputBuilder({
              customId: 'identity',
              placeholder: [
                `You\'re a Discord agent, your name is "${this.discordService.client.user.username}".`,
                "You'll anwser any question",
                'etc...',
              ].join('\n'),
              label: 'Agent identity',
              style: TextInputStyle.Paragraph,
              required: false,
            }),
          ],
        }),
      ],
    });

    return await interaction.showModal(modal);
  }
}
