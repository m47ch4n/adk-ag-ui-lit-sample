export type MessagePosition = "left" | "right";

export type MessageVariant = "primary" | "secondary";

export interface ChatMessageData {
	id: string;
	position: MessagePosition;
	variant: MessageVariant;
	avatar: string;
	content: string;
}

export interface ChatLoadingData {
	position: MessagePosition;
	variant: MessageVariant;
	avatar: string;
}
