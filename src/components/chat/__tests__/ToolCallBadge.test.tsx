import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolCallDescription, ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// Pure function tests
test("str_replace_editor create", () => {
  expect(getToolCallDescription("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating /App.jsx");
});

test("str_replace_editor str_replace", () => {
  expect(getToolCallDescription("str_replace_editor", { command: "str_replace", path: "/components/Card.jsx" })).toBe("Editing /components/Card.jsx");
});

test("str_replace_editor insert", () => {
  expect(getToolCallDescription("str_replace_editor", { command: "insert", path: "/components/Card.jsx" })).toBe("Editing /components/Card.jsx");
});

test("str_replace_editor view", () => {
  expect(getToolCallDescription("str_replace_editor", { command: "view", path: "/components/Card.jsx" })).toBe("Reading /components/Card.jsx");
});

test("str_replace_editor undo_edit", () => {
  expect(getToolCallDescription("str_replace_editor", { command: "undo_edit", path: "/components/Card.jsx" })).toBe("Undoing edit in /components/Card.jsx");
});

test("file_manager rename", () => {
  expect(getToolCallDescription("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming /old.jsx to /new.jsx");
});

test("file_manager delete", () => {
  expect(getToolCallDescription("file_manager", { command: "delete", path: "/Card.jsx" })).toBe("Deleting /Card.jsx");
});

test("unknown toolName returns toolName", () => {
  expect(getToolCallDescription("some_unknown_tool", { command: "do_something", path: "/file.js" })).toBe("some_unknown_tool");
});

test("missing command returns fallback", () => {
  expect(getToolCallDescription("str_replace_editor", undefined)).toBe("Working on file…");
});

// Render tests
test("ToolCallBadge shows description text", () => {
  const invocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "result",
    result: "ok",
  };
  render(<ToolCallBadge toolInvocation={invocation} />);
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("ToolCallBadge shows green dot when state is result", () => {
  const invocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "result",
    result: "ok",
  };
  const { container } = render(<ToolCallBadge toolInvocation={invocation} />);
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("ToolCallBadge shows spinner when state is call", () => {
  const invocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "call",
  };
  const { container } = render(<ToolCallBadge toolInvocation={invocation} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge shows spinner when state is partial-call", () => {
  const invocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "partial-call",
  };
  const { container } = render(<ToolCallBadge toolInvocation={invocation} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
});
