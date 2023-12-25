export type Languages = 'en-US' | 'fr-FR' | 'en-EN' | 'fr' | 'en';
export interface I18nLang {
  devana: {
    service: {
      INTERNAL_SERVER_ERROR: string;
      FETCH_ERROR: string;
      UPLOAD_ERROR: string;
      INVALID_MODEL: string;
    };
  };
  discord: {
    commands: {
      link: {
        MISSING_CHANNEL: string;
        MISSING_AGENT: string;
        MISSING_CONFIG: string;
        AGENT_NOT_FOUND: string;
        ALREADY_LINKED: string;
        LINKED: string;
      };
      unlink: {
        MISSING_CHANNEL: string;
        MISSING_CONFIG: string;
        NOT_LINKED: string;
        UNLINKED: string;
      };
      delete: {
        MISSING_KNOWLEDGE_OR_AGENT: string;
        AGENT_NOT_FOUND: string;
        AGENT_DELETED: string;
        KNOWLEDGE_NOT_FOUND: string;
        KNOWLEDGE_DELETED: string;
      };
      configuration: {
        CONFIG_TITLE: string;
        CONFIG_DESCRIPTION: string;
        CONFIG_PIN: string;
        CONFIG_CREATED: string;
      };
    };
    context: {
      create_agent: {
        OWN_MESSAGE_ERROR: string;
        LOADING_CREATE_AGENT: string;
        KNOWLEDGE_NOT_FOUND: string;
        EMBED_CREATED_TITLE: string;
        EMBED_CREATED_DESCRIPTION: string;
      };
      create_knowledge: {
        OWN_MESSAGE_ERROR: string;
        LOADING_CREATE_KNOWLEDGE: string;
        EMBED_CREATED_TITLE: string;
        EMBED_CREATED_DESCRIPTION: string;
      };
    };
    gateway: {
      message_create: {
        THREAD_ANNOUNCE: string;
      };
    };
  };
}
