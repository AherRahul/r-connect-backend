// src/types/sib-api-v3-sdk.d.ts

declare module 'sib-api-v3-sdk' {
  export class TransactionalEmailsApi {
    sendTransacEmail(email: SendSmtpEmail): Promise<SendSmtpEmailResponse>;
    setApiKey(apiKey: string): void;
  }

  export class ApiClient {
    static instance: ApiClient;
    authentications: {
      'api-key': { apiKey: string };
    };
  }

  export interface SendSmtpEmail {
    sender?: { email: string; name?: string };
    to?: Array<{ email: string; name?: string }>;
    subject?: string;
    htmlContent?: string;
    textContent?: string;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    replyTo?: { email: string; name?: string };
    headers?: { [key: string]: string };
    params?: { [key: string]: string };
  }

  export interface SendSmtpEmailResponse {
    messageId: string;
  }
}
