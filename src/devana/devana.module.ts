import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DevanaService } from './devana.service';

@Module({
  imports: [
    HttpModule.register({
      headers: {
        'User-Agent': 'DevanaDiscordBot/0.0.1',
        hostcli: 'app.devana.ai',
      },
      baseURL: 'https://api.devana.ai/',
    }),
  ],
  providers: [DevanaService],
  exports: [DevanaService],
})
export class DevanaModule {}
