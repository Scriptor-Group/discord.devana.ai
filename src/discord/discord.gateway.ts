import { Injectable, Logger } from '@nestjs/common';
import { Once, On, Context, ContextOf } from 'necord';
import { DiscordService } from './discord.service';
import { HttpService } from '@nestjs/axios';
import { DevanaService } from 'src/devana/devana.service';

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
    this.discordService.client = client;
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('interactionCreate')
  public async onInteractionCreate(
    @Context() [interaction]: ContextOf<'interactionCreate'>,
  ) {
    if (!interaction.isButton()) return;

    const knowledgeBases = await this.devanaService.getKnowledgeBases();

    console.log(knowledgeBases);

    const configMessage = await this.discordService.getConfigMessage(
      interaction.guild,
    );

    if (!configMessage) return interaction.reply('No config message found.');
  }
}
