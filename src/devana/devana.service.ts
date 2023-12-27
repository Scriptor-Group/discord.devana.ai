import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Attachment, Collection, Snowflake } from 'discord.js';
import EventSource from 'eventsource';
import { Observable, firstValueFrom } from 'rxjs';
import { I18nService } from 'src/i18n/i18n.service';

// Devana service is used to communicate with Devana API
@Injectable()
export class DevanaService {
  private logger = new Logger(DevanaService.name);
  public token: string;
  // Default models are used to validate model provided by user
  private defaultModels = {
    GPT4: 'GPT4',
    GPT35: 'GPT35',
    LLAMA2: 'LLAMA2',
    LLAMA2_13B: 'LLAMA2_13B',
    CLAUDE_V2: 'CLAUDE_V2',
    CLAUDE_V21: 'CLAUDE_V21',
    TITAN_EMBED_TEXT_V1: 'TITAN_EMBED_TEXT_V1',
    JURRASIC_2_MID: 'JURRASIC_2_MID',
    JURRASIC_2_ULTRA: 'JURRASIC_2_ULTRA',
    CLAUDE_V2_EU: 'CLAUDE_V2_EU',
    TITAN_EMBED_TEXT_V1_EU: 'TITAN_EMBED_TEXT_V1_EU',
    JURRASIC_2_MID_EU: 'JURRASIC_2_MID_EU',
    JURRASIC_2_ULTRA_EU: 'JURRASIC_2_ULTRA_EU',
    MISTRAL_7B: 'MISTRAL_7B',
    MAXTRAL_BY_MISTRAL: 'MAXTRAL_BY_MISTRAL',
    LLAMA2_CODE: 'LLAMA2_CODE',
    GEMINI: 'GEMINI',
    GPT4_TURBO: 'GPT4_TURBO',
  };

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private i18n: I18nService,
  ) {}

  /**
   * Will be used to get token from Devana API using credentials provided in .env file
   * @param force Boolean will regenerate a new token if set to true
   * @returns String token
   */
  async getToken(force = false) {
    // If token is already set and force is false, return token
    if (this.token && !force) {
      return this.token;
    }

    // If token is not set or force is true, generate a new token
    try {
      // Requesting Devana via graphql requests
      const request = this.httpService.post('graphql', {
        operationName: 'Login',
        variables: {
          email: this.configService.get<string>('DEVANA_LOGIN'),
          password: this.configService.get<string>('DEVANA_PASSWORD'),
        },
        query: `mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password)
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      this.token = response.data.login;

      // Setting token in axios headers for future requests
      this.httpService.axiosRef.defaults.headers.common.Authorization = `Bearer ${this.token}`;

      return response.data.login;
    } catch {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Will be used to ask Devana API to ask an agent a question
   * @param agentId String agent id
   * @param prompt String question
   * @param chatId String chat id (not necessary)
   * @returns Promise<any>
   */
  async askAgent(agentId: string, prompt: string, chatId?: string) {
    try {
      const request = this.httpService.get(`${agentId}`, {
        params: {
          prompt,
          chatId: chatId || '',
          files: '',
        },
        headers: {
          Authorization: `Bearer ${this.configService.get('DEVANA_API_KEY')}`,
        },
      });

      const { data: response } = await firstValueFrom(request);

      return response;
    } catch {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Will be used to ask Devana API to ask an agent a question using stream (EventSource)
   * @param agentId String agent id
   * @param prompt String question
   * @param chatId String chat id (not necessary)
   * @returns Observable<any>
   */
  async askAgentStream(agentId: string, prompt: string, chatId?: string) {
    // We use URLSearchParams to create a query string
    const params = new URLSearchParams({
      message: prompt,
      chatId: chatId || '',
      files: '',
      token: this.token,
    });

    // We return an observable because we will use it as a stream
    return new Observable<{ text: string }>((observer) => {
      // We create a new EventSource with the agent id and the query string to ask Devana
      const source = new EventSource(
        `https://api.devana.ai/chat/${agentId}?${params.toString()}`,
      );

      let content = '';
      let lastSent = Date.now() - 1500;

      // We listen to the message event to get the answer from Devana
      source.onmessage = (event) => {
        // We check if the message is a JSON or a text and set it as content
        const message = event.data.startsWith('[JSON]') ? '' : event.data;
        if (!message) return;

        content += message;

        // We check if the last message was sent less than 1.5s ago (not to flood discord)
        if (Date.now() - lastSent < 1500) return;
        lastSent = Date.now();

        observer.next({
          text: content.replace(/\\n/g, `\n`),
        });
      };

      // We listen to the error event to close the stream, this is a trick from Devana API
      // to close the stream when the agent has no more answers
      source.onerror = () => {
        source.close();
        // We send the last message to the observer
        observer.next({
          text: content.replace(/\\n/g, `\n`),
        });
        observer.complete();
      };

      return () => {
        source.close();
      };
    });
  }

  /**
   * Will be used to get all chats with agents from Devana API
   * @param take Number number of chats to get
   * @param skip Number number of chats to skip
   * @param search String search query
   * @returns Promise<any>
   */
  async getChats(take = 20, skip = 0, search = '') {
    try {
      const request = this.httpService.post('graphql', {
        operationName: 'GetHistoricalConv',
        variables: { take, skip, search },
        query: `query GetHistoricalConv($take: Int, $skip: Int, $search: String) {
          getHistoricalConv(take: $take, skip: $skip, search: $search) {
            edges {
              id
              message
              parentId
              iaId
            }
          }
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return response.data.getHistoricalConv.edges;
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Will be used to get all agents from Devana API
   * @param search String search query
   * @returns Promise<any>
   */
  async getAgents(search = '') {
    try {
      const request = this.httpService.post('graphql', {
        operationName: 'getAllMyIAs',
        variables: { search },
        query: `query getAllMyIAs($take: Int, $skip: Int, $search: String) {
          getAllMyIAs(take: $take, skip: $skip, search: $search) {
            edges {
              id
              name
            }
          }
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return response.data.getAllMyIAs.edges;
    } catch (error) {
      throw new HttpException(
        {
          message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR'),
        },
        500,
      );
    }
  }

  /**
   * Delete an agent from devana api
   * @param id String agent id
   * @returns Promise<any>
   */
  async deleteAgent(id: string) {
    try {
      const request = this.httpService.post('graphql', {
        operationName: 'DeleteMyIA',
        variables: { id },
        query: `mutation DeleteMyIA($id: ID!) {
          deleteMyIAs(id: $id)
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return response.data.deleteMyIA;
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Get a knowledge base from devana api
   * @param id String knowledge base id
   * @returns Promise<any>
   */
  public async getKnowledgeBase(id: string) {
    try {
      const request = this.httpService.post('graphql', {
        operationName: 'GetFolder',
        variables: { id },
        query: `query GetFolder($id: String!) {
          getFolder(id: $id) {
            id
            name
            ias {
              edges {
                id
                name
              }
            }
          }
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return response.data.getFolder;
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Get all knowledge bases from devana api
   * @param search String search query
   * @returns Promise<any>
   */
  public async getKnowledgeBases(search = '') {
    try {
      const request = this.httpService.post('graphql', {
        operationName: 'GetAllFoldersPagination',
        variables: { search },
        query: `query GetAllFoldersPagination(
          $take: Int, 
          $skip: Int, 
          $search: String
        ) {
          getFoldersPagination(take: $take, skip: $skip, search: $search) {
            edges {
              id
              name
              ias {
                edges {
                  id
                  name
                }
              }
            }
          }
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return response.data.getFoldersPagination.edges;
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Delete a knowledge base from devana api
   * @param id String knowledge base id
   * @returns Promise<any>
   */
  public async deleteKnowledgeBase(id: string) {
    try {
      const request = this.httpService.post('graphql', {
        operationName: 'DeleteFolder',
        variables: { id },
        query: `mutation DeleteFolder($id: String!) {
          deleteFolder(id: $id)
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return response.data.deleteFolder;
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Get all models from devana api
   * @returns Promise<any>
   */
  public async getModels() {
    try {
      const request = this.httpService.post('graphql', {
        operationName: 'GetModels',
        query: `query GetModels {
          __type(name: "TypeLLMEnum") {
            name
            enumValues {
              name
            }
          }
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      // Because the response is an enum, we convert it back again as an object
      return Object.fromEntries(
        response.data.__type.enumValues.map((model) => [
          model.name,
          model.name,
        ]),
      );
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Create an agent from devana api
   * @param name String agent name
   * @param description String agent description
   * @param model String agent model
   * @param knowledgeBases String[] agent knowledge bases
   * @param options Object agent options
   * @param identity Object agent identity
   * @returns Promise<any>
   */
  public async createAgent({
    name,
    description,
    model,
    knowledgeBases,
    options,
    identity,
  }: {
    name: string;
    description?: string;
    model?: string;
    knowledgeBases?: string[];
    options?: {
      sources?: boolean;
      public?: boolean;
      internet?: boolean;
    };
    identity?: {
      type?: 'FREEDOM' | 'LIMITED' | 'STRICT';
      prompt?: string;
    };
  }) {
    const models = (await this.getModels()) || this.defaultModels;

    if (model && !models[model]) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INVALID_MODEL') },
        400,
      );
    }

    try {
      const request = this.httpService.post('graphql', {
        operationName: 'UpsertMyIAs',
        variables: {
          id: null,
          name,
          description: description || '',
          textColor: '#000000',
          backgroundColor: '#ffffff',
          suggestions: [''],
          welcomeMessage: '',
          overrideUrl: 'https://',
          iaIdentity: identity?.prompt || '',
          freeLevel: identity?.type || 'FREEDOM',
          model: model || 'GPT4',
          iaType: 'ASSISTANT',
          folderIds: knowledgeBases || [],
          showSources: options?.sources || false,
          publicChat: options?.public || false,
          connectWeb: options?.internet || false,
        },
        query: `mutation UpsertMyIAs(
          $id: ID, 
          $name: String!, 
          $metadata: MetadataInputMyIAs, 
          $description: String, 
          $backgroundColor: String, 
          $textColor: String, 
          $logoUrl: String, 
          $iaType: IATypes!, 
          $welcomeMessage: String, 
          $publicChat: Boolean, 
          $overrideUrl: String, 
          $iaIdentity: String, 
          $freeLevel: String, 
          $showSources: Boolean, 
          $suggestions: [String], 
          $placeholder: String, 
          $model: String, 
          $folderIds: [String], 
          $connectWeb: Boolean
        ) {
          upsertMyIAs(
            id: $id
            name: $name
            metadata: $metadata
            description: $description
            backgroundColor: $backgroundColor
            textColor: $textColor
            logoUrl: $logoUrl
            iaType: $iaType
            welcomeMessage: $welcomeMessage
            publicChat: $publicChat
            showSources: $showSources
            overrideUrl: $overrideUrl
            iaIdentity: $iaIdentity
            freeLevel: $freeLevel
            suggestions: $suggestions
            placeholder: $placeholder
            model: $model
            folderIds: $folderIds
            connectWeb: $connectWeb
          ) {
            id
            name
          }
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return response.data.upsertMyIAs;
    } catch {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Create a knowledge base skeleton from devana api
   * @param name String knowledge base name
   * @returns Promise<any>
   */
  public async createKnowledgeBaseSkeleton(name: string) {
    // Devana API needs to have the skeleton before hydrating knowledge with datas
    try {
      const request = this.httpService.post('graphql', {
        operationName: 'createFolder',
        variables: { name: name.replace(/[^A-Za-z0-9\séèà]/g, '') },
        query: `mutation createFolder($name: String!, $id: String) {
          upsetFolder(name: $name, id: $id) {
            id
            name
          }
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return response.data.upsetFolder;
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Upload knowledge base documents to devana api
   * @param knowledgeBaseId String knowledge base id
   * @param attachments Collection<Snowflake, Attachment> attachments to upload
   * @returns Promise<any>
   */
  public async uploadKnowledgeBaseDocuments(
    knowledgeBaseId: string,
    attachments: Collection<Snowflake, Attachment>,
  ) {
    // Formdata will be used to set all our files
    const formData = new FormData();

    // We loop through all attachments and add them to formdata
    try {
      await Promise.all(
        attachments.map(async ({ url }) => {
          // We fetch the attachment from discord and turn them into blob
          // Blob is a file format used to upload files as binary
          const response = await fetch(url);
          const blob = await response.blob();
          formData.append('file', blob);
        }),
      );
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.FETCH_ERROR') },
        500,
      );
    }

    try {
      const request = this.httpService.post('api/upload', formData, {
        headers: {
          Folder: knowledgeBaseId,
        },
      });

      const { data: response } = await firstValueFrom(request);

      return response.ids;
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.UPLOAD_ERROR') },
        500,
      );
    }
  }

  /**
   * Upload knowledge base document to devana api
   * @param knowledgeBaseId String knowledge base id
   * @param blob Blob file to upload
   * @returns Promise<any>
   */
  public async uploadKnowledgeBaseDocument(
    knowledgeBaseId: string,
    blob: Blob,
  ) {
    const formData = new FormData();

    formData.append('file', blob);

    try {
      const request = this.httpService.post('api/upload', formData, {
        headers: {
          Folder: knowledgeBaseId,
        },
      });

      const { data: response } = await firstValueFrom(request);

      return response.ids;
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Upload knowledge base websites to devana api
   * @param knowledgeBaseId String knowledge base id
   * @param url String[] urls to upload
   * @returns Promise<any>
   */
  public async uploadKnowledgeBaseWebsites(
    knowledgeBaseId: string,
    url: string[],
  ) {
    const inputs = url.map((url) => ({
      url,
      name: url.replace(/[^A-Za-z0-9\séèà\.]/g, ''),
      origin: 'WEBSITE',
      depth: 2,
      recurrence: 'NEVER',
    }));

    try {
      const request = this.httpService.post('graphql', {
        operationName: 'upsertWebsite',
        variables: {
          foldersId: knowledgeBaseId,
          inputs,
        },
        query: `mutation upsertWebsite($foldersId: ID!, $inputs: [TypeWebsiteInputs!]) {
          upsertWebsite(inputs: $inputs, foldersId: $foldersId) {
            id
            name
            url
            origin
          }
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return response.data.upsertWebsite;
    } catch (error) {
      throw new HttpException(
        { message: this.i18n.t('en', 'devana.service.INTERNAL_SERVER_ERROR') },
        500,
      );
    }
  }

  /**
   * Create a knowledge base from devana api
   * @param name String knowledge base name
   * @param content String knowledge base content
   * @param attachments Collection<Snowflake, Attachment> knowledge base attachments
   * @returns Promise<any>
   */
  public async createKnowledgeBase(
    name: string,
    content: string,
    attachments: Collection<Snowflake, Attachment>,
  ) {
    // Create the skeleton in order to hydrate it further on
    const knowledgeBase = await this.createKnowledgeBaseSkeleton(name);

    // Get all the urls contained in the message to hydrate them
    const urls = content.match(/https?:\/\/[^\s]+/g);

    // Hydrate skeleton with urls, content and attachments
    if (urls) {
      await this.uploadKnowledgeBaseWebsites(knowledgeBase.id, urls);
    }
    await this.uploadKnowledgeBaseDocument(
      knowledgeBase.id,
      new Blob([content], { type: 'text/plain' }),
    );
    await this.uploadKnowledgeBaseDocuments(knowledgeBase.id, attachments);

    return knowledgeBase;
  }
}
