export type MessagePosition = "left" | "right";

export type MessageVariant = "primary" | "secondary";

export interface ChatMessageData {
  id: string;
  position: MessagePosition;
  variant: MessageVariant;
  content: string;
  reasoning?: string;
}

export interface ChatLoadingData {
  position: MessagePosition;
  variant: MessageVariant;
  reasoning?: string;
}
