import { StringOption } from 'necord';

export class DeleteDto {
  @StringOption({
    name: 'knowledge',
    description: 'Knowledge base to delete',
    autocomplete: true,
    required: false,
  })
  knowledgeBase: string;

  @StringOption({
    name: 'agent',
    description: 'Agent to delete',
    autocomplete: true,
    required: false,
  })
  agent: string;
}
