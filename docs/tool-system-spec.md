# Lit Event-Driven Tool System Specification

## Overview

This specification defines a comprehensive tool system for the AG-UI Lit frontend, inspired by the Kotlin AG-UI Tools SDK patterns while adhering to Lit/Web Components idioms and "properties down, events up" architecture.

## Reference: Kotlin AG-UI Tools SDK

Based on [ag-ui-protocol/ag-ui - Kotlin Tools SDK](https://github.com/ag-ui-protocol/ag-ui/tree/dbc09702ffbbd76df2b850a2c04302ad754e346e/sdks/community/kotlin/library/tools/src/commonMain/kotlin/com/agui/tools)

| Component | Purpose |
|-----------|---------|
| `ToolRegistry` | Tool registration, lookup, and statistics tracking |
| `ToolExecutor` | Execution interface with validation support |
| `ToolExecutionManager` | Lifecycle orchestration with events (Started/Executing/Succeeded/Failed) |
| `ToolErrorHandling` | Retry strategies, circuit breaker, error categorization |

---

## Proposed Architecture

### File Structure

```
web/src/
├── tools/
│   ├── index.ts                    # Public exports
│   ├── types.ts                    # Core type definitions
│   ├── errors.ts                   # Error classes and categorization
│   ├── tool-registry.ts            # ToolRegistry class
│   ├── tool-executor.ts            # ToolExecutor interface and implementations
│   └── tool-execution-manager.ts   # Orchestration with lifecycle events
├── types/
│   ├── tool.ts                     # (existing, to be extended)
│   └── events.ts                   # (existing, to be extended)
└── ag-ui-agent.ts                  # (existing, to be modified)
```

---

## 1. Core Types (`web/src/tools/types.ts`)

### Tool Definition

```typescript
import type { z } from "zod";

export type ToolHandler<TArgs = Record<string, unknown>> = (
  args: TArgs,
  context: ToolExecutionContext,
) => string | Promise<string>;

export interface ToolDefinition<TArgs = Record<string, unknown>> {
  name: string;
  description: string;
  schema: z.ZodType<TArgs>;        // Zod schema for validation
  handler: ToolHandler<TArgs>;
  metadata?: ToolMetadata;
}

export interface ToolMetadata {
  category?: string;               // e.g., "filesystem", "network", "ui"
  idempotent?: boolean;
  estimatedDuration?: number;      // ms
  retryConfig?: RetryConfig;
  tags?: string[];
}
```

### Execution Status (matching Kotlin lifecycle)

```typescript
export type ToolExecutionStatus =
  | "pending"      // Queued, not started
  | "validating"   // Input validation in progress
  | "executing"    // Handler running
  | "succeeded"    // Completed successfully
  | "failed"       // Error occurred
  | "cancelled";   // Aborted by user/system
```

### Execution Context

```typescript
export interface ToolExecutionContext {
  executionId: string;
  toolCallId: string;
  signal: AbortSignal;             // For cancellation
  attemptNumber: number;           // 1-based
  maxAttempts: number;
}
```

### Execution Record

```typescript
export interface ToolExecution {
  id: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  status: ToolExecutionStatus;
  result?: string;
  error?: ToolError;
  timing: {
    queuedAt: number;
    startedAt?: number;
    completedAt?: number;
    duration?: number;
  };
  retry: {
    attemptNumber: number;
    maxAttempts: number;
    previousErrors: ToolError[];
  };
}
```

### Retry Configuration

```typescript
export interface RetryConfig {
  maxAttempts: number;             // default: 3
  baseDelay: number;               // default: 1000ms
  maxDelay: number;                // default: 30000ms
  backoffMultiplier: number;       // default: 2
  retryableCategories: ToolErrorCategory[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableCategories: ["transient", "timeout"],
};
```

---

## 2. Error Handling (`web/src/tools/errors.ts`)

### Error Categories

```typescript
export type ToolErrorCategory =
  | "validation"   // Input failed schema validation
  | "execution"    // Handler threw an error
  | "timeout"      // Execution exceeded time limit
  | "cancelled"    // AbortSignal triggered
  | "transient"    // Temporary failure (network, etc.)
  | "permanent"    // Unrecoverable error
  | "unknown";
```

### Structured Error

```typescript
export interface ToolError {
  category: ToolErrorCategory;
  message: string;
  cause?: unknown;
  retryable: boolean;
  retryAfter?: number;             // Suggested delay in ms
  validationErrors?: Array<{
    path: string[];
    message: string;
    received?: unknown;
  }>;
}
```

### Error Categorization Function

```typescript
export function categorizeError(
  error: unknown,
  defaultCategory: ToolErrorCategory = "unknown",
): ToolError;
```

Handles:
- `DOMException` with `name === "AbortError"` → `cancelled`
- Zod validation errors → `validation` with `validationErrors`
- Timeout errors → `timeout`
- Network/fetch errors → `transient`

---

## 3. Tool Registry (`web/src/tools/tool-registry.ts`)

### Class Definition

```typescript
export class ToolRegistry extends EventTarget {
  register<TArgs>(definition: ToolDefinition<TArgs>): void;
  unregister(name: string): boolean;
  clear(): void;
  get(name: string): RegisteredTool | undefined;
  has(name: string): boolean;
  get names(): string[];
  get all(): RegisteredTool[];
  getByCategory(category: string): RegisteredTool[];
  getByTag(tag: string): RegisteredTool[];
  toAgUiTools(): Array<{ name, description, parameters }>;
}

export const globalToolRegistry = new ToolRegistry();
```

### Events

| Event | Detail |
|-------|--------|
| `tool-registry-change` | `{ action: "registered" \| "unregistered" \| "cleared", toolName?, toolNames }` |

---

## 4. Tool Executor (`web/src/tools/tool-executor.ts`)

### Interface

```typescript
export interface ToolExecutor {
  execute(
    tool: RegisteredTool,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult>;
}

export type ToolExecutionResult =
  | { success: true; result: string }
  | { success: false; error: ToolError };
```

### Implementations

1. **DefaultToolExecutor**: Basic execution with abort support
2. **ValidatingToolExecutor**: Adds Zod schema validation before execution

---

## 5. Tool Execution Manager (`web/src/tools/tool-execution-manager.ts`)

### Class Definition

```typescript
export class ToolExecutionManager extends EventTarget {
  constructor(
    executor?: ToolExecutor,
    defaultRetryConfig?: RetryConfig,
  );

  execute(
    tool: RegisteredTool,
    toolCallId: string,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult>;

  cancel(executionId: string): boolean;
  cancelAll(): void;
  getExecution(executionId: string): ToolExecution | undefined;
  getExecutionsForToolCall(toolCallId: string): ToolExecution[];
}
```

### Lifecycle Events

| Event | Detail | Timing |
|-------|--------|--------|
| `tool-execution-started` | `{ execution }` | When queued |
| `tool-execution-validating` | `{ executionId, toolName, args }` | Before validation |
| `tool-execution-executing` | `{ executionId, toolName, attemptNumber }` | Before handler |
| `tool-execution-succeeded` | `{ execution, result }` | On success |
| `tool-execution-failed` | `{ execution, error }` | After all retries |
| `tool-execution-retrying` | `{ executionId, toolName, attemptNumber, maxAttempts, error, delayMs }` | Before retry delay |
| `tool-execution-cancelled` | `{ executionId, toolName }` | On abort |

---

## 6. Extended ag-ui-agent Events

### New/Enhanced Events

| Event | Detail |
|-------|--------|
| `ag-ui-tool-status-changed` | `{ toolCallId, toolCallName, status, execution }` |
| `ag-ui-tool-retrying` | `{ toolCallId, toolCallName, attemptNumber, maxAttempts, error, delayMs }` |

### Enhanced Existing Events

```typescript
// ag-ui-tool-call-end now includes execution record
interface AgUiToolCallEndEvent extends CustomEvent<{
  toolCallId: string;
  toolCallName: string;
  toolCallArgs: Record<string, unknown>;
  result: string;
  execution?: ToolExecution;  // NEW
}> {}

// ag-ui-tool-call-error now uses structured error
interface AgUiToolCallErrorEvent extends CustomEvent<{
  toolCallId: string;
  toolCallName: string;
  error: ToolError;           // CHANGED from unknown
  execution?: ToolExecution;  // NEW
}> {}
```

---

## 7. Integration Pattern

### Modified ag-ui-agent.ts

```typescript
export class AgUiAgent extends LitElement {
  private _registry: ToolRegistry = globalToolRegistry;
  private _executionManager = new ToolExecutionManager(
    new ValidatingToolExecutor(),
  );

  registerTool<TArgs>(definition: ToolDefinition<TArgs>): void {
    this._registry.register(definition);
    // Also register schema with ValidatingToolExecutor
  }

  // In onToolCallEndEvent callback:
  // Use _executionManager.execute() instead of direct handler call
}
```

### Tool Definition Pattern

```typescript
import { z } from "zod";
import type { ToolDefinition } from "../tools/types.js";

const schema = z.object({
  query: z.string().min(1),
});

export const myToolDefinition: ToolDefinition<z.infer<typeof schema>> = {
  name: "my_tool",
  description: "Does something useful",
  schema,
  handler: async (args, context) => {
    if (context.signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return `Result: ${args.query}`;
  },
  metadata: {
    category: "search",
    idempotent: true,
    retryConfig: {
      maxAttempts: 5,
      baseDelay: 500,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableCategories: ["transient", "timeout"],
    },
  },
};
```

---

## Implementation Plan

### Phase 1: Core Types and Errors
- Create `web/src/tools/types.ts`
- Create `web/src/tools/errors.ts`

### Phase 2: Tool Registry
- Create `web/src/tools/tool-registry.ts`
- Add event dispatching

### Phase 3: Tool Executor
- Create `web/src/tools/tool-executor.ts`
- Implement DefaultToolExecutor and ValidatingToolExecutor

### Phase 4: Execution Manager
- Create `web/src/tools/tool-execution-manager.ts`
- Implement retry logic with exponential backoff
- Implement lifecycle events
- Implement cancellation

### Phase 5: Integration
- Update `web/src/types/events.ts`
- Modify `ag-ui-agent.ts`
- Update `hello-tool.ts` example
- Create `web/src/tools/index.ts`

### Phase 6: Verification
- Test retry scenarios
- Test cancellation
- Test validation errors
- End-to-end test with agent backend

---

## Critical Files

| File | Action |
|------|--------|
| `web/src/tools/types.ts` | Create |
| `web/src/tools/errors.ts` | Create |
| `web/src/tools/tool-registry.ts` | Create |
| `web/src/tools/tool-executor.ts` | Create |
| `web/src/tools/tool-execution-manager.ts` | Create |
| `web/src/tools/index.ts` | Create |
| `web/src/types/events.ts` | Modify |
| `web/src/ag-ui-agent.ts` | Modify |
| `web/src/tools/hello-tool.ts` | Modify |

---

## Key Design Decisions

1. **Event-driven architecture**: Matches Lit's reactive system and existing patterns
2. **Zod for validation**: Already used in the project, provides type inference
3. **AbortController for cancellation**: Standard Web API, works with fetch
4. **Exponential backoff with jitter**: Prevents thundering herd in retry scenarios
5. **Singleton registry**: Allows tools to register from anywhere via document events
6. **Separate Manager from Executor**: Single responsibility, easier testing
