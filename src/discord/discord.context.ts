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

@Injectable()
export class DiscordContext {
  private readonly logger = new Logger(DiscordContext.name);

  constructor(
    private discordService: DiscordService,
    private devanaService: DevanaService,
  ) {
    this.logger.log('DiscordContext constructor');
  }

  @MessageCommand({
    name: 'Create agent',
  })
  public async createAgentFromMessage(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
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

  @MessageCommand({
    name: 'Create knowledge base',
  })
  public async createKnowledgeBaseFromMessage(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    if (message.author.id === this.discordService.client.user.id)
      return interaction.reply({
        content: `I can't create knowledge base from my own messages`,
      });

    interaction.reply({
      content: `Creating knowledge base`,
    });

    const question = await this.devanaService.askAgent(
      'clqh6r78100200trlvthv3sf7',
      encodeURIComponent(
        `Define the following text in maximum two words without using special characters : "${message.content}"`,
      ),
    );

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
