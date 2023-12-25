import { Injectable, Logger } from '@nestjs/common';
import { Once, On, Context, ContextOf } from 'necord';
import { DiscordService } from './discord.service';
import { DevanaService } from 'src/devana/devana.service';
import { TextChannel } from 'discord.js';
import { I18nService } from 'src/i18n/i18n.service';

// A gateway is a class used to handle the events of the discord client
// this is the core of the bot, it is used to handle the messages, the threads, the reactions, etc...
@Injectable()
export class DiscordGateway {
  private readonly logger = new Logger(DiscordGateway.name);

  constructor(
    private discordService: DiscordService,
    private devanaService: DevanaService,
    private i18n: I18nService,
  ) {
    this.logger.log('DiscordGateway initiated');
  }

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    // Initiate the token and set it as default headers
    this.devanaService.getToken();
    // Get all the configs messages for cache
    client.guilds.cache.forEach((guild) => {
      this.discordService.getConfigMessage(guild);
    });
    // Set the discord client inside of the discord service, we use it a lot ;)
    this.discordService.client = client;
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('messageCreate')
  public async onMessageCreate(
    @Context() [message]: ContextOf<'messageCreate'>,
  ) {
    if (message.author.id === this.discordService.client.user.id) return;

    // Get if the bot is mentionned
    const mentionned = message.mentions.users.find(
      (user) => user.id === this.discordService.client.user.id,
    );

    // Here we check if the channel is a thread just to see if it's the first message later
    if (!mentionned && !message.channel.isThread()) return;

    if (message.channel.isThread() && !mentionned) {
      // We fetch the two last messages to check if its the first message of the thread
      const fmessage = await message.channel.messages.fetch({ limit: 2 });
      if (fmessage.size > 1) return;
    }

    // Parsed content (see src/discord/discord.service.ts for more informations)
    const content = this.discordService.replaceMention(message);

    const channelAgent = this.discordService.getChannelAgent(
      message.channel as TextChannel,
    );

    if (!channelAgent) return;

    const question = await this.devanaService.askAgent(channelAgent, content);

    if (!question) return;

    return message.reply(
      message.channel.isThread() && !mentionned
        ? [
            this.i18n.t('en', 'discord.gateway.message_create.THREAD_ANNOUNCE'),
            '',
            question.text,
          ].join('\n')
        : question.text,
    );
  }
}
