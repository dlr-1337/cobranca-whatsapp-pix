export interface OutboxMessage {
  to: string;
  subject: string;
  html: string;
}

export * from "./email/index.js";
