// src/types/sib-api-v3-sdk.d.ts

declare module 'sib-api-v3-sdk' {
  export class TransactionalEmailsApi {
    sendTransacEmail(email: unknown): Promise<unknown>;
    setApiKey(key: string, value: string): void;
  }
}
