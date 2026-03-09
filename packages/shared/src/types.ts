/**
 * Claude Code Hook event types.
 * Based on the Claude Code hooks reference.
 */

export type HookEventName =
  | "Stop"
  | "SessionEnd"
  | "Notification"
  | "PreToolUse"
  | "PostToolUse"
  | "SubagentStop";

export interface BaseHookEvent {
  session_id: string;
  transcript_path: string;
  hook_event_name: HookEventName;
}

export interface StopEvent extends BaseHookEvent {
  hook_event_name: "Stop";
  stop_hook_active: boolean;
}

export interface SessionEndEvent extends BaseHookEvent {
  hook_event_name: "SessionEnd";
}

export interface NotificationEvent extends BaseHookEvent {
  hook_event_name: "Notification";
  message: string;
}

export interface ToolUseEvent extends BaseHookEvent {
  hook_event_name: "PreToolUse" | "PostToolUse";
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response?: string;
}

export type HookEvent =
  | StopEvent
  | SessionEndEvent
  | NotificationEvent
  | ToolUseEvent;
