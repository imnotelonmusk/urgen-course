import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

export function getToolCallDescription(toolName: string, args: Record<string, string> | undefined): string {
  if (!args || !args.command) return "Working on file…";

  const { command, path, new_path } = args;

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create": return `Creating ${path}`;
      case "str_replace": return `Editing ${path}`;
      case "insert": return `Editing ${path}`;
      case "view": return `Reading ${path}`;
      case "undo_edit": return `Undoing edit in ${path}`;
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename": return `Renaming ${path} to ${new_path}`;
      case "delete": return `Deleting ${path}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: { toolInvocation: ToolInvocation }) {
  const description = getToolCallDescription(toolInvocation.toolName, toolInvocation.args as Record<string, string>);
  const isDone = toolInvocation.state === "result";

  return (
    <div data-testid="tool-call-badge" className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{description}</span>
    </div>
  );
}
