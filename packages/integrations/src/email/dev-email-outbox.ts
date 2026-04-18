import type { AuthEmailTokenKind } from "@cobrazap/domain";

export interface DevEmailOutboxMessage {
  kind: AuthEmailTokenKind;
  to: string;
  subject: string;
  html: string;
  link: string;
  createdAt: Date;
}

export function createDevEmailOutbox() {
  const messages: DevEmailOutboxMessage[] = [];

  return {
    send(message: DevEmailOutboxMessage) {
      messages.push(message);
      return message;
    },

    listMessages() {
      return [...messages];
    },

    clear() {
      messages.length = 0;
    },
  };
}

export type DevEmailOutbox = ReturnType<typeof createDevEmailOutbox>;
