import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CommandsModule, NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { DiscordModule } from './discord/discord.module';
import { HttpModule } from '@nestjs/axios';
import { DevanaModule } from './devana/devana.module';

@Module({
  imports: [
    NecordModule.forRoot({
      token: process.env.DISCORD_TOKEN,
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.DirectMessages,
      ],
    }),
    ConfigModule.forRoot({
      envFilePath: [
        '.env.local',
        '.env.development',
        '.env.production',
        '.env.*',
        '.env',
      ],
      isGlobal: true,
    }),
    DiscordModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
