import { css } from "lit";

export const chatMessageBaseStyles = css`
  :host {
    display: block;
  }

  .message {
    display: flex;
    align-items: flex-start;

    &.left {
      & .bubble {
        background: transparent;
        color: var(--chat-bubble-assistant-text);
      }
    }

    &.right {
      flex-direction: row-reverse;
      margin-left: auto;
      max-width: var(--chat-message-max-width);

      & .bubble {
        border-radius: var(--chat-radius-lg);
        border-top-right-radius: var(--chat-radius-sm);
      }
    }

    &.primary .bubble {
      background: var(--chat-bubble-user-bg);
      color: var(--chat-bubble-user-text);
    }
  }

  .bubble {
    padding: var(--chat-spacing-md) var(--chat-spacing-lg);
    line-height: var(--chat-line-height-normal);
    word-break: break-word;
    font-size: var(--chat-font-size-base);
  }
`;
