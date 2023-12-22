import { Injectable, Logger } from '@nestjs/common';
import { Context, Modal, ModalContext } from 'necord';

@Injectable()
export class DiscordModal {
  private readonly logger = new Logger(DiscordModal.name);

  @Modal('configuration')
  public async onConfigModal(@Context() [interaction]: ModalContext) {
    return interaction.reply({ content: 'Pong!' });
  }
}
