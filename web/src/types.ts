/** メッセージの配置 */
export type MessagePosition = "left" | "right";

/** メッセージのバリアント */
export type MessageVariant = "primary" | "secondary";

/** メッセージデータ */
export interface ChatMessageData {
	id: string;
	position: MessagePosition;
	variant: MessageVariant;
	avatar: string;
	content: string;
}

/** ローディング表示用データ */
export interface ChatLoadingData {
	position: MessagePosition;
	variant: MessageVariant;
	avatar: string;
}
