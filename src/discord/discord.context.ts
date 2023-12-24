import { Injectable, Logger } from '@nestjs/common';
import { Message } from 'discord.js';
import {
  Context,
  MessageCommand,
  MessageCommandContext,
  TargetMessage,
} from 'necord';
import { DiscordService } from './discord.service';
import { DevanaService } from 'src/devana/devana.service';

// A context is a class used to handle the context menu commands
@Injectable()
export class DiscordContext {
  private readonly logger = new Logger(DiscordContext.name);

  constructor(
    private discordService: DiscordService,
    private devanaService: DevanaService,
  ) {
    this.logger.log('DiscordContext initiated');
  }

  // Create Agent context menu command is used to create a new agent from a knowledge base message
  @MessageCommand({
    name: 'Create agent',
    // TODO: Add default permission for admin only
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
        content: `I can only create agent from my own knowledge base messages`,
      });

    interaction.reply({
      content: `Creating agent`,
    });

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
        content: `Knowledge base ${knowledgeBaseId} not found`,
      });

    // Create the agent from the knowledge base
    const agent = await this.devanaService.createAgent({
      name: knowledgeBase.name,
      description: knowledgeBase.name,
      model: 'GPT4',
      knowledgeBases: [knowledgeBaseId],
    });

    return interaction.channel.send({
      embeds: [
        {
          url: `https://app.devana.ai/chat/${agent.id}`,
          title: 'Agent created',
          description: `Agent ${agent.name} created`,
          fields: [
            {
              name: 'agent-id',
              value: agent.id,
            },
          ],
        },
      ],
    });
  }

  // Create Knowledge base context menu command is used to create a new knowledge base from a message
  @MessageCommand({
    name: 'Create knowledge base',
    // TODO: Add default permission for admin only
  })
  public async createKnowledgeBaseFromMessage(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    // Quite straightforward, check if the targeted message is from the bot
    if (message.author.id === this.discordService.client.user.id)
      return interaction.reply({
        content: `I can't create knowledge base from my own messages`,
      });

    // We let the user know that we are creating the knowledge base
    // this is set because it can take quite a while
    interaction.reply({
      content: `Creating knowledge base`,
      ephemeral: true,
    });

    // Here we use a default Devana AI to ask it to get a short description
    // of the message content, it will be used as the knowledge base name
    const question = await this.devanaService.askAgent(
      'clqh6r78100200trlvthv3sf7',
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
          title: 'Knowledge base created',
          description: `Knowledge base ${knowledgeBase.name} created`,
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
}
