/**
 * Provider-private Cohere v2 Chat wire vocabulary. Only the shapes this
 * provider reads or writes appear here; every field the loop does not use is
 * omitted rather than typed loosely. The wire format and native `fetch` client
 * are provider-private and do not use `ctx.llm`.
 * @module @workspacealberta/web-search-cohere/types
 */

/** One client-side function tool in the v2 `tools` request array. */
export interface CohereToolDefinition {
  readonly type: 'function'
  readonly function: {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>
  }
}

/** One tool call on an assistant message; `arguments` is a JSON-encoded string. */
export interface CohereToolCall {
  readonly id: string
  readonly type: 'function'
  readonly function: {
    readonly name: string
    readonly arguments: string
  }
}

/** v2 user message; `content` is plain text. */
export interface CohereUserMessage {
  readonly role: 'user'
  readonly content: string
}

/** v2 assistant message: direct prose, tool calls, or both (`tool_plan` is ignored). */
export interface CohereAssistantMessage {
  readonly role: 'assistant'
  readonly content?: string
  readonly tool_calls?: readonly CohereToolCall[]
}

/**
 * v2 tool-result message. `content` carries one `document` block per acquired
 * source; `document.data` is the source serialized as a JSON string so the
 * model can cite it and the provider can map citations back to URLs.
 */
export interface CohereToolResultMessage {
  readonly role: 'tool'
  readonly tool_call_id: string
  readonly content: readonly CohereToolContentBlock[]
}

/** One document block inside a tool-result message. */
export interface CohereToolContentBlock {
  readonly type: 'document'
  readonly document: {
    readonly data: string
    readonly id?: string
  }
}

/** The closed v2 message union this loop produces. */
export type CohereChatMessage =
  | CohereUserMessage
  | CohereAssistantMessage
  | CohereToolResultMessage

/** v2 Chat request body. */
export interface CohereChatRequest {
  readonly model: string
  readonly messages: readonly CohereChatMessage[]
  readonly max_tokens: number
  readonly tools?: readonly CohereToolDefinition[]
  /** Force generated tool calls to follow the tool definition strictly. */
  readonly strict_tools?: boolean
}

/** One block of a block-array assistant `content`; `text` carries prose. */
export interface CohereContentBlock {
  readonly type: string
  readonly text?: string
}

/** One citation source reference: `id` is `<tool_call_id>:<document index>`. */
export interface CohereCitationSource {
  readonly type: string
  readonly id?: string
}

/** One citation span on the final assistant message. */
export interface CohereCitation {
  readonly start?: number
  readonly end?: number
  readonly text?: string
  readonly sources: readonly CohereCitationSource[]
}

/** v2 Chat response `message` payload; `content` is text or content blocks. */
export interface CohereResponseMessage {
  readonly role: 'assistant'
  readonly content?: string | readonly CohereContentBlock[]
  readonly tool_calls?: readonly CohereToolCall[]
  readonly citations?: readonly CohereCitation[]
}

/** v2 Chat response body. */
export interface CohereChatResponse {
  readonly message: CohereResponseMessage
  readonly finish_reason?: string
}

/** Cohere error body; both observed shapes are accepted. */
export interface CohereError {
  readonly message?: string
  readonly detail?: string | readonly { readonly message?: string }[]
}
