import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Attachment, Collection, Snowflake } from 'discord.js';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DevanaService {
  public token: string;
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
  ) {}

  async getToken(force = false) {
    if (this.token && !force) {
      return this.token;
    }

    try {
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

      this.httpService.axiosRef.interceptors.request.use(
        (config) => {
          config.headers.Authorization = `Bearer ${this.token}`;
          return config;
        },
        (error) => {
          return Promise.reject(error);
        },
      );

      return response.data.login;
    } catch (error) {
      throw new HttpException({ message: error.message }, error.status);
    }
  }

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
      throw new HttpException({ message: error.message }, error.status);
    }
  }

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
      throw new HttpException({ message: error.message }, error.status);
    }
  }

  public async getModels() {
    try {
      const request = this.httpService.post('graphql', {
        operationName: 'GetModels',
        query: `query GetModels() {
          __type(name: "TypeLLMEnum") {
            name
            enumValues {
              name
            }
          }
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return Object.fromEntries(
        response.__type.enumValues.map((model) => [model.name, model.name]),
      );
    } catch (error) {
      throw new HttpException({ message: error.message }, error.status);
    }
  }

  public async createAgent({
    name,
    description,
    model,
    knowledgeBase,
    options,
    identity,
  }: {
    name: string;
    description?: string;
    model?: string;
    knowledgeBase?: string[];
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
      throw new HttpException({ message: 'Invalid model provided.' }, 400);
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
          folderIds: knowledgeBase || [],
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
      throw new HttpException({ message: 'Error creating agent.' }, 500);
    }
  }

  public async createKnowledgeBaseSkeleton(name: string) {
    try {
      const request = this.httpService.post('graphql', {
        operationName: 'createFolder',
        variables: { name },
        query: `mutation createFolder($name: String!, $id: String) {
          upsetFolder(name: $name, id: $id) {
            id
            name
          }
        }`,
      });

      const { data: response } = await firstValueFrom(request);

      return response.data.upsetFolder;
    } catch (error) {}
  }

  public async upsertKnowledgeBaseDocuments({}: KnowledgeBaseDocument[]) {}

  public async upsertKnowledgeBaseSource({}: KnowledgeBaseSource) {}

  public async createKnowledgeBase({}) {}

  public async uploadKnowledgeBaseDocument(
    knowledgeBaseId: string,
    attachments: Collection<Snowflake, Attachment>,
  ) {
    const formData = new FormData();

    try {
      await Promise.all(
        attachments.map(async ({ url }) => {
          const response = await fetch(url);
          const blob = await response.blob();
          formData.append('file', blob);
        }),
      );
    } catch (error) {
      throw new HttpException({ message: error.message }, error.status);
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
      throw new HttpException({ message: error.message }, error.status);
    }
  }
}
