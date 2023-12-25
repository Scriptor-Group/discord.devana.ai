import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DevanaService } from './devana.service';
import { I18nModule } from 'src/i18n/i18n.module';

// Declaration of Devana module, which is used to communicate with Devana API
@Module({
  imports: [
    // Registering HttpModule to be used in DevanaService
    // hostcli is mandatory for whitemarks bug
    HttpModule.register({
      headers: {
        'User-Agent': 'DevanaDiscordBot/0.0.1',
        hostcli: 'app.devana.ai',
      },
      baseURL: 'https://api.devana.ai/',
    }),
    I18nModule,
  ],
  providers: [DevanaService],
  exports: [DevanaService],
})
export class DevanaModule {}
