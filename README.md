# Devana Discord BOT

## Installation

```bash
yarn
# Here u go that's it
```

### On Discord

On Discord you will have to use `/configuration` to create a configuration message that will be used to store your configurations.

Context menu :
1. Right click on the message
2. Hover over "Apps"
3. Select "Create agent" or "Create knowledge base"
   - "Create knowledge base" will create a new knowledge base from the messages and the attachments of the message you clicked on.
   - "Create agent" will create a new agent from the aknowledgment message of knowledge base creation automaticaly sent by the bot after the creation of the knowledge base

Commands :
1. /link
   - This command will link the channel to the agent you want to use.
2. /unlink
   - This command will unlink the channel from the agent.
3. /delete
   - This command will delete either an agent or a knowledge base.

If you want to edit bot context menu or commands permissions go to Server Settings > Integrations > Devana

## Development

```bash
git clone git@github.com:Scriptor-Group/discord.devana.ai.git
cd discord.devana.ai
yarn
yarn start:dev
```

A few notes for developers
Please keep this code clean, not too much cyclomatic complexity, keep it clean with line breaks and comments, thank you c:

## Description

[Devana](https://devana.ai) is a powerful AI that does things, just test it u'll understand.

## Stay in touch

- Author - [Andy SANT](https://github.com/Arkmind)
- Website - [https://devana.ai](https://devana.ai/)

## License

No idea.
