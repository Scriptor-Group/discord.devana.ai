import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ComponentType, ModalSubmitInteraction } from 'discord.js';
import { Context, Modal, ModalContext, ModalParam } from 'necord';
import { PROMP_GET_DATA } from 'src/devana/devana.prompts';
import { DevanaService } from 'src/devana/devana.service';
import { I18nService } from 'src/i18n/i18n.service';

@Injectable()
export class DiscordModal {
  private readonly logger = new Logger(DiscordModal.name);

  constructor(
    private devanaService: DevanaService,
    private configService: ConfigService,
    private i18n: I18nService,
  ) {}

  /**
   * Returns true if the text is a valid JSON
   * @param text string The text to check
   * @returns boolean
   */
  private isValidJSON(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Returns the value of an input from a modal interaction
   * @param interaction ModalSubmitInteraction The interaction of the modal
   * @param customId string The custom id of the input
   * @returns string | undefined The value of the input
   */
  private getInputValue(
    interaction: ModalSubmitInteraction,
    customId: string,
  ): string | undefined {
    return interaction.components
      .find(
        (component) =>
          component.type === ComponentType.ActionRow &&
          component.components.some(
            (component) =>
              component.type === ComponentType.TextInput &&
              component.customId === customId,
          ),
      )
      ?.components.find(
        (component) =>
          component.type === ComponentType.TextInput &&
          component.customId === customId,
      )?.value;
  }

  /**
   * Create an agent from a knowledge base and a modal interaction
   * @param param0 ModalContext Interaction of the modal
   * @param knowledgeId string The knowledge base id
   * @returns Promise<Message> The message sent in the channel
   */
  @Modal('agent/:knowledgeId')
  public async onAgentModal(
    @Context() [interaction]: ModalContext,
    @ModalParam('knowledgeId') knowledgeId: string,
  ) {
    this.logger.log('onAgentModal');
    // Get the values from the modal
    const name = this.getInputValue(interaction, 'name');
    const description = this.getInputValue(interaction, 'description');
    const identity = this.getInputValue(interaction, 'identity');

    interaction.reply({
      content: this.i18n.t(
        'en',
        'discord.context.create_agent.LOADING_CREATE_AGENT',
      ),
      ephemeral: true,
    });

    try {
      // Ask agent to get datas from the description prompt
      const response = await this.devanaService.askAgent(
        this.configService.get<string>('DEVANA_AGENT_BASE'),
        this.i18n.setKeysInString(PROMP_GET_DATA, {
          models: JSON.stringify(await this.devanaService.getModels()),
          text: description,
        }),
      );

      const data = this.isValidJSON(response.text)
        ? JSON.parse(response.text)
        : {};

      this.logger.log('Data from description', JSON.stringify(data));

      // Create the agent from the knowledge base
      const agent = await this.devanaService.createAgent({
        name,
        description,
        model: data.model || 'GPT4',
        knowledgeBases: [knowledgeId],
        identity: {
          prompt: identity,
          type: data.identity || 'FREEDOM',
        },
        options: {
          internet: data.internet || false,
          public: data.public || false,
          sources: data.sources || false,
        },
      });

      return interaction.channel.send({
        embeds: [
          {
            url: `https://app.devana.ai/chat/${agent.id}`,
            title: this.i18n.t(
              'en',
              'discord.context.create_agent.EMBED_CREATED_TITLE',
            ),
            description: this.i18n.t(
              'en',
              'discord.context.create_agent.EMBED_CREATED_DESCRIPTION',
              agent.name,
            ),
            fields: [
              {
                name: 'agent-id',
                value: agent.id,
              },
            ],
          },
        ],
      });
    } catch (error) {
      return interaction.reply({
        content: this.i18n.t(
          'en',
          'discord.context.create_agent.INTERNAL_SERVER_ERROR',
          error.message,
        ),
        ephemeral: true,
      });
    }
  }
}
