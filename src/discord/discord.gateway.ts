import { Injectable, Logger } from '@nestjs/common';
import { Once, On, Context, ContextOf } from 'necord';
import { DiscordService } from './discord.service';
import { HttpService } from '@nestjs/axios';
import { DevanaService } from 'src/devana/devana.service';
import { TextChannel } from 'discord.js';

@Injectable()
export class DiscordGateway {
  private readonly logger = new Logger(DiscordGateway.name);

  constructor(
    private discordService: DiscordService,
    private devanaService: DevanaService,
    private httpService: HttpService,
  ) {}

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.devanaService.getToken();
    client.guilds.cache.forEach((guild) => {
      this.discordService.getConfigMessage(guild);
    });
    this.discordService.client = client;
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('threadCreate')
  public async onThreadCreate(@Context() [thread]: ContextOf<'threadCreate'>) {
    console.log(thread);
  }

  @On('messageCreate')
  public async onMessageCreate(
    @Context() [message]: ContextOf<'messageCreate'>,
  ) {
    if (message.author.id === this.discordService.client.user.id) return;

    const mentionned = message.mentions.users.find(
      (user) => user.id === this.discordService.client.user.id,
    );

    if (!mentionned && !message.channel.isThread()) return;

    if (message.channel.isThread() && !mentionned) {
      const fmessage = await message.channel.messages.fetch({ limit: 2 });
      if (fmessage.size > 1) return;
    }

    const content = this.discordService.replaceMention(message);

    const channelAgent = this.discordService.getChannelAgent(
      message.channel as TextChannel,
    );

    console.log(message.channel, channelAgent);

    if (!channelAgent) return;

    const question = await this.devanaService.askAgent(channelAgent, content);

    if (!question) return;

    return message.reply(
      message.channel.isThread() && !mentionned
        ? [
            `*Ce message est auto généré après la création de ce thread et tentera de répondre au mieux à votre question. Si vous souhaitez parler à un agent, mentionnez le dans votre message.*`,
            '',
            question.text,
          ].join('\n')
        : question.text,
    );
  }
}
