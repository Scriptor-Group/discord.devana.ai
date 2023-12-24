import { Injectable, Logger } from '@nestjs/common';
import { Context, Modal, ModalContext } from 'necord';

@Injectable()
export class DiscordModal {
  private readonly logger = new Logger(DiscordModal.name);

  // TODO: Implement the agent modal in order to configure
  // the agent with more details, we will use AI to get all
  // the data we need from the input
  @Modal('agent')
  public async onConfigModal(@Context() [interaction]: ModalContext) {
    return interaction.reply({ content: 'Pong!' });
  }
}
