import type { Message } from "@/modules/chat/types";

// Mock messages for conv-1: "Explain async/await in JavaScript"
export const MOCK_MESSAGES: Message[] = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    role: "user",
    content: "Can you explain how async/await works under the hood in JavaScript?",
    createdAt: "2026-03-07T10:23:00Z",
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    role: "assistant",
    content:
      "Sure! Async/await is syntactic sugar over Promises, which in turn are built on top of the event loop.\n\nWhen you mark a function as `async`, it always returns a Promise. The `await` keyword pauses the execution of that async function until the awaited Promise resolves — but crucially, it doesn't block the main thread. Instead, it yields control back to the event loop, letting other code run in the meantime.",
    createdAt: "2026-03-07T10:23:15Z",
    model: "llama3.2",
  },
  {
    id: "msg-3",
    conversationId: "conv-1",
    role: "user",
    content: "So it's non-blocking? How does the event loop know to resume my function?",
    createdAt: "2026-03-07T10:25:00Z",
  },
  {
    id: "msg-4",
    conversationId: "conv-1",
    role: "assistant",
    content:
      "Exactly — it's non-blocking. Under the hood, the async function is transformed into a state machine. Each `await` point is a state.\n\nWhen the awaited Promise resolves, a microtask is queued. The event loop processes all microtasks before moving to the next macrotask (like a setTimeout callback). So your function resumes almost immediately after the Promise resolves, without ever blocking the thread.",
    createdAt: "2026-03-07T10:25:20Z",
    model: "llama3.2",
  },
  {
    id: "msg-5",
    conversationId: "conv-1",
    role: "user",
    content: "What's the difference between a microtask and a macrotask?",
    createdAt: "2026-03-07T10:27:00Z",
  },
  {
    id: "msg-6",
    conversationId: "conv-1",
    role: "assistant",
    content:
      "Great question. The event loop processes tasks in a specific order:\n\n**Macrotasks** (task queue): `setTimeout`, `setInterval`, I/O callbacks, UI rendering. Only one runs per loop iteration.\n\n**Microtasks** (microtask queue): Promise callbacks (`.then`, `.catch`), `queueMicrotask`. All pending microtasks run to completion after each macrotask, before the next macrotask starts.\n\nThis is why `Promise.resolve().then(...)` always runs before `setTimeout(() => ..., 0)`, even though both are async.",
    createdAt: "2026-03-07T10:27:30Z",
    model: "llama3.2",
  },
  {
    id: "msg-7",
    conversationId: "conv-1",
    role: "user",
    content: "Can you show me a simple code example?",
    createdAt: "2026-03-07T10:29:00Z",
  },
  {
    id: "msg-8",
    conversationId: "conv-1",
    role: "assistant",
    content:
      "Here's a minimal example:\n\n```js\nasync function fetchUser(id) {\n  const response = await fetch(`/api/users/${id}`);\n  const user = await response.json();\n  return user;\n}\n\n// Usage\nfetchUser(1).then(user => console.log(user));\nconsole.log('This runs before the user is fetched!');\n```\n\nThe `console.log` at the bottom runs first because `fetchUser` yields at the first `await`, letting the rest of the synchronous code finish before it resumes.",
    createdAt: "2026-03-07T10:29:20Z",
    model: "llama3.2",
  },
  {
    id: "msg-9",
    conversationId: "conv-1",
    role: "user",
    content: "What happens if the promise rejects? How do I handle errors?",
    createdAt: "2026-03-07T10:31:00Z",
  },
  {
    id: "msg-10",
    conversationId: "conv-1",
    role: "assistant",
    content:
      "If an awaited Promise rejects, it throws an error inside the async function — just like a synchronous throw. You handle it with `try/catch`:\n\n```js\nasync function fetchUser(id) {\n  try {\n    const response = await fetch(`/api/users/${id}`);\n    if (!response.ok) throw new Error('Not found');\n    return await response.json();\n  } catch (err) {\n    console.error('Failed to fetch user:', err);\n    return null;\n  }\n}\n```\n\nAlternatively, you can chain `.catch()` on the returned Promise, but `try/catch` inside async functions is generally cleaner and easier to read.",
    createdAt: "2026-03-07T10:31:35Z",
    model: "llama3.2",
  },
  {
    id: "msg-11",
    conversationId: "conv-1",
    role: "user",
    content: "This is really clear. One last thing — when should I use Promise.all?",
    createdAt: "2026-03-07T10:39:00Z",
  },
  {
    id: "msg-12",
    conversationId: "conv-1",
    role: "assistant",
    content:
      "Use `Promise.all` when you have multiple independent async operations that can run in parallel:\n\n```js\n// Sequential (slow — waits for each)\nconst user = await fetchUser(1);\nconst posts = await fetchPosts(1);\n\n// Parallel (fast — both requests fire at once)\nconst [user, posts] = await Promise.all([\n  fetchUser(1),\n  fetchPosts(1),\n]);\n```\n\n`Promise.all` rejects immediately if any Promise rejects (fail-fast). If you want all results regardless of failures, use `Promise.allSettled` instead.",
    createdAt: "2026-03-07T10:41:00Z",
    model: "llama3.2",
  },
];
