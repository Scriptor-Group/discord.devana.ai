import { Injectable } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { DevanaService } from 'src/devana/devana.service';

@Injectable()
export class AgentAutocompleteInterceptor extends AutocompleteInterceptor {
  constructor(private devanaService: DevanaService) {
    super();
  }

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    let choices: string[] = [];

    const agents = await this.devanaService.getAgents();

    if (focused.name === 'agent') {
      choices = agents.map((agent) => agent.name);
    }

    return interaction.respond(
      choices
        .filter((choice) => choice.startsWith(focused.value.toString()))
        .map((choice) => ({ name: choice, value: choice })),
    );
  }
}
