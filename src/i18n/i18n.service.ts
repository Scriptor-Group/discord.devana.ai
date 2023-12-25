import { Injectable, Logger } from '@nestjs/common';
import frFR from './locales/fr-FR.json';
import enUS from './locales/en-EN.json';
import { Languages } from './i18n.types';

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);

  constructor() {
    this.logger.log('I18nService initiated');
  }

  private getLocale(locale: string) {
    switch (locale) {
      case 'fr-FR' || 'fr':
        return frFR;
      case 'en-US' || 'en':
        return enUS;
      default:
        return enUS;
    }
  }

  public t(
    locale: Languages,
    key: string,
    ...args: (string | { [key: string]: string } | string[])[]
  ): string {
    const localeFile = this.getLocale(locale);

    const keys = key.split('.');
    let value = localeFile;

    for (const key of keys) {
      value = value[key];
    }

    if (typeof value !== 'string') return value.toString();

    const text = value as string;

    if (Array.isArray(args[0])) args = args[0];
    if (typeof args[0] === 'object') {
      return text.replace(/%(.*)%/g, (_, match) => args[0][match] || match);
    }

    return text.replace(/%(.*)%/g, (_, match) => args.shift() || match);
  }
}
