import { Injectable } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { DevanaService } from 'src/devana/devana.service';

// An interceptor is a class used to transform the options of a command
// This interceptor is used to autocomplete the knowledge base names
// It is used in the LinkDto class
// It is used in the DeleteDto class
@Injectable()
export class KnowledgeAutocompleteInterceptor extends AutocompleteInterceptor {
  constructor(private devanaService: DevanaService) {
    super();
  }

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    let choices: string[] = [];

    const knowledgeBases = await this.devanaService.getKnowledgeBases();

    if (focused.name === 'knowledge') {
      choices = knowledgeBases.map((knowledge) => knowledge.name);
    }

    return interaction.respond(
      choices
        .filter((choice) => choice.startsWith(focused.value.toString()))
        .map((choice) => ({ name: choice, value: choice })),
    );
  }
}
