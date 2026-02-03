import { css } from "lit";

export const chatTokens = css`
  :host {
    /* Primitive Colors - Neutral */
    --chat-color-neutral-50: #fafafa;
    --chat-color-neutral-100: #f5f5f5;
    --chat-color-neutral-200: #e5e5e5;
    --chat-color-neutral-300: #d4d4d4;
    --chat-color-neutral-400: #a3a3a3;
    --chat-color-neutral-500: #737373;
    --chat-color-neutral-600: #525252;
    --chat-color-neutral-700: #404040;
    --chat-color-neutral-800: #262626;
    --chat-color-neutral-900: #171717;
    --chat-color-neutral-950: #0a0a0a;

    /* Primitive Colors - Error */
    --chat-color-error-50: #fef2f2;
    --chat-color-error-100: #fee2e2;
    --chat-color-error-200: #fecaca;
    --chat-color-error-300: #fca5a5;
    --chat-color-error-400: #f87171;
    --chat-color-error-500: #ef4444;
    --chat-color-error-600: #dc2626;

    /* Semantic - Surface */
    --chat-surface-primary: #ffffff;
    --chat-surface-secondary: var(--chat-color-neutral-50);
    --chat-surface-tertiary: var(--chat-color-neutral-100);
    --chat-surface-inverse: var(--chat-color-neutral-900);

    /* Semantic - Text */
    --chat-text-primary: var(--chat-color-neutral-900);
    --chat-text-secondary: var(--chat-color-neutral-600);
    --chat-text-muted: var(--chat-color-neutral-400);
    --chat-text-inverse: #ffffff;
    --chat-text-error: var(--chat-color-error-600);

    /* Semantic - Border */
    --chat-border-primary: var(--chat-color-neutral-200);
    --chat-border-secondary: var(--chat-color-neutral-100);
    --chat-border-focus: var(--chat-color-neutral-300);
    --chat-border-error: var(--chat-color-error-200);

    /* Component - Bubble */
    --chat-bubble-user-bg: var(--chat-surface-inverse);
    --chat-bubble-user-text: var(--chat-text-inverse);
    --chat-bubble-assistant-bg: var(--chat-surface-tertiary);
    --chat-bubble-assistant-text: var(--chat-text-primary);
    --chat-bubble-assistant-border: var(--chat-border-primary);

    /* Component - Avatar */
    --chat-avatar-user-bg: var(--chat-surface-inverse);
    --chat-avatar-user-text: var(--chat-text-inverse);
    --chat-avatar-assistant-bg: var(--chat-surface-tertiary);
    --chat-avatar-assistant-text: var(--chat-text-secondary);
    --chat-avatar-assistant-border: var(--chat-border-primary);

    /* Component - Input */
    --chat-input-bg: var(--chat-surface-secondary);
    --chat-input-bg-focus: var(--chat-surface-primary);
    --chat-input-text: var(--chat-text-primary);
    --chat-input-placeholder: var(--chat-text-muted);
    --chat-input-border: var(--chat-border-primary);
    --chat-input-border-focus: var(--chat-border-focus);

    /* Component - Button */
    --chat-button-bg: var(--chat-surface-inverse);
    --chat-button-text: var(--chat-text-inverse);
    --chat-button-disabled-bg: var(--chat-color-neutral-200);
    --chat-button-disabled-text: var(--chat-text-muted);

    /* Component - Error */
    --chat-error-bg: var(--chat-color-error-50);
    --chat-error-border: var(--chat-color-error-200);
    --chat-error-text: var(--chat-color-error-600);

    /* Component - Empty State */
    --chat-empty-text: var(--chat-text-muted);

    /* Component - Scrollbar */
    --chat-scrollbar-thumb: var(--chat-color-neutral-200);
    --chat-scrollbar-thumb-hover: var(--chat-color-neutral-300);

    /* Layout - Spacing */
    --chat-spacing-xs: 0.25rem;
    --chat-spacing-sm: 0.5rem;
    --chat-spacing-md: 0.75rem;
    --chat-spacing-lg: 1rem;
    --chat-spacing-xl: 1.5rem;
    --chat-spacing-2xl: 2rem;

    /* Layout - Radius */
    --chat-radius-sm: 0.25rem;
    --chat-radius-md: 0.5rem;
    --chat-radius-lg: 1.25rem;
    --chat-radius-full: 9999px;

    /* Typography */
    --chat-font-family: inherit;
    --chat-font-family-mono: "SF Mono", Monaco, Menlo, Consolas, monospace;
    --chat-font-size-xs: 0.75rem;
    --chat-font-size-sm: 0.875rem;
    --chat-font-size-base: 0.9375rem;
    --chat-font-size-lg: 1rem;
    --chat-font-size-xl: 1.15em;
    --chat-font-size-2xl: 1.3em;
    --chat-font-size-3xl: 1.5em;
    --chat-line-height-normal: 1.5;
    --chat-line-height-relaxed: 1.6;

    /* Layout - Container */
    --chat-container-max-width: 720px;
    --chat-message-max-width: 80%;
  }

  /* Dark theme */
  :host-context([data-theme="dark"]) {
    /* Semantic - Surface */
    --chat-surface-primary: #0a0a0a;
    --chat-surface-secondary: var(--chat-color-neutral-900);
    --chat-surface-tertiary: var(--chat-color-neutral-800);
    --chat-surface-inverse: var(--chat-color-neutral-100);

    /* Semantic - Text */
    --chat-text-primary: var(--chat-color-neutral-100);
    --chat-text-secondary: var(--chat-color-neutral-400);
    --chat-text-muted: var(--chat-color-neutral-500);
    --chat-text-inverse: var(--chat-color-neutral-900);
    --chat-text-error: var(--chat-color-error-400);

    /* Semantic - Border */
    --chat-border-primary: var(--chat-color-neutral-700);
    --chat-border-secondary: var(--chat-color-neutral-800);
    --chat-border-focus: var(--chat-color-neutral-600);
    --chat-border-error: var(--chat-color-error-500);

    /* Component - Bubble */
    --chat-bubble-user-bg: var(--chat-surface-inverse);
    --chat-bubble-user-text: var(--chat-text-inverse);
    --chat-bubble-assistant-bg: var(--chat-surface-tertiary);
    --chat-bubble-assistant-text: var(--chat-text-primary);
    --chat-bubble-assistant-border: var(--chat-border-primary);

    /* Component - Avatar */
    --chat-avatar-user-bg: var(--chat-surface-inverse);
    --chat-avatar-user-text: var(--chat-text-inverse);
    --chat-avatar-assistant-bg: var(--chat-surface-tertiary);
    --chat-avatar-assistant-text: var(--chat-text-secondary);
    --chat-avatar-assistant-border: var(--chat-border-primary);

    /* Component - Input */
    --chat-input-bg: var(--chat-surface-secondary);
    --chat-input-bg-focus: var(--chat-surface-primary);
    --chat-input-text: var(--chat-text-primary);
    --chat-input-placeholder: var(--chat-text-muted);
    --chat-input-border: var(--chat-border-primary);
    --chat-input-border-focus: var(--chat-border-focus);

    /* Component - Button */
    --chat-button-bg: var(--chat-surface-inverse);
    --chat-button-text: var(--chat-text-inverse);
    --chat-button-disabled-bg: var(--chat-color-neutral-700);
    --chat-button-disabled-text: var(--chat-text-muted);

    /* Component - Error */
    --chat-error-bg: #1a0a0a;
    --chat-error-border: var(--chat-color-error-500);
    --chat-error-text: var(--chat-color-error-400);

    /* Component - Scrollbar */
    --chat-scrollbar-thumb: var(--chat-color-neutral-700);
    --chat-scrollbar-thumb-hover: var(--chat-color-neutral-600);
  }
`;
