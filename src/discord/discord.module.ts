import { Module } from '@nestjs/common';
import { DiscordGateway } from './discord.gateway';
import { DiscordService } from './discord.service';
import { DiscordModal } from './discord.modal';
import { DiscordCommands } from './discord.commands';
import { AppService } from 'src/app.service';
import { HttpModule } from '@nestjs/axios';
import { DevanaModule } from 'src/devana/devana.module';
import { DiscordContext } from './discord.context';

@Module({
  imports: [
    HttpModule.register({
      headers: {
        'User-Agent': 'DevanaDiscordBot/0.0.1',
        hostcli: 'app.devana.ai',
      },
    }),
    DevanaModule,
  ],
  providers: [
    DiscordCommands,
    DiscordContext,
    DiscordGateway,
    DiscordService,
    DiscordModal,
    AppService,
  ],
})
export class DiscordModule {}
