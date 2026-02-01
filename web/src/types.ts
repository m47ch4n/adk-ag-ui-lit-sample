/** Message position */
export type MessagePosition = "left" | "right";

/** Message variant */
export type MessageVariant = "primary" | "secondary";

/** Chat message data */
export interface ChatMessageData {
	id: string;
	position: MessagePosition;
	variant: MessageVariant;
	avatar: string;
	content: string;
}

/** Loading indicator data */
export interface ChatLoadingData {
	position: MessagePosition;
	variant: MessageVariant;
	avatar: string;
}
