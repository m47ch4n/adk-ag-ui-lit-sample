import { css } from "lit";

export const chatMessageBaseStyles = css`
  :host {
    display: block;
  }

  .message {
    display: flex;
    gap: var(--chat-spacing-md);
    align-items: flex-start;
    max-width: var(--chat-message-max-width);
  }

  .message.left {
    margin-right: auto;
  }

  .message.right {
    flex-direction: row-reverse;
    margin-left: auto;
  }

  .avatar {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: var(--chat-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--chat-font-size-xs);
    font-weight: 500;
    flex-shrink: 0;
  }

  .message.primary .avatar {
    background: var(--chat-avatar-user-bg);
    color: var(--chat-avatar-user-text);
  }

  .message.secondary .avatar {
    background: var(--chat-avatar-assistant-bg);
    color: var(--chat-avatar-assistant-text);
    border: 1px solid var(--chat-avatar-assistant-border);
  }

  .bubble {
    padding: var(--chat-spacing-md) var(--chat-spacing-lg);
    border-radius: var(--chat-radius-lg);
    line-height: var(--chat-line-height-normal);
    word-break: break-word;
    font-size: var(--chat-font-size-base);
  }

  .message.primary .bubble {
    background: var(--chat-bubble-user-bg);
    color: var(--chat-bubble-user-text);
  }

  .message.right .bubble {
    border-top-right-radius: var(--chat-radius-sm);
  }

  .message.secondary .bubble {
    background: var(--chat-bubble-assistant-bg);
    color: var(--chat-bubble-assistant-text);
  }

  .message.left .bubble {
    border-top-left-radius: var(--chat-radius-sm);
  }
`;
