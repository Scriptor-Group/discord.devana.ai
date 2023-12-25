import { Injectable, Logger } from '@nestjs/common';
import * as frFR from './locales/fr-FR.json';
import * as enUS from './locales/en-EN.json';
import { I18nLang, Languages } from './i18n.types';

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);

  constructor() {
    this.logger.log('I18nService initiated');
  }

  /**
   * Return the locale file from the locale string
   * @param locale string The locale string
   * @returns I18nLang
   */
  private getLocale(locale: string): I18nLang {
    switch (locale) {
      case 'fr-FR' || 'fr':
        return frFR;
      case 'en-US' || 'en':
        return enUS;
      default:
        return enUS;
    }
  }

  /**
   * Returns the translated text from the locale and the key
   * @param locale string The locale
   * @param key string The key devided by a dot "." (ex: "discord.context.create_agent.OWN_MESSAGE_ERROR")
   * @param args string | { [key: string]: string } | string[] The arguments to replace in the text
   * @returns string The translated text
   */
  public t(
    locale: Languages,
    key: string,
    ...args: (string | { [key: string]: string } | string[])[]
  ): string {
    const localeFile = this.getLocale(locale);

    // Splitting the key with dots and getting the value from the locale file
    // we do that to get the same results as an object
    const keys = key.split('.');
    let value = localeFile;

    // We loop through all the keys to get the value
    for (const key of keys) {
      value = value[key];
    }

    if (typeof value !== 'string') return value.toString();

    const text = value as string;

    // If the first argument is an array or an object we use it as the argument list
    if (Array.isArray(args[0])) args = args[0];
    // If the first argument is an object we get keys from the object and use them to match
    // the text
    if (typeof args[0] === 'object') {
      return text.replace(/%(.*)%/g, (_, match) => args[0][match] || match);
    }

    return text.replace(/%(.*)%/g, (_, match) => args.shift() || match);
  }
}
