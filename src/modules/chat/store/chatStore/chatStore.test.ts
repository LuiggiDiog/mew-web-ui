import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from ".";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/modules/shared/constants";

const INITIAL_STATE = {
  drawerOpen: false,
  selectedConversationId: null,
  activeModel: DEFAULT_MODEL,
  activeProvider: DEFAULT_PROVIDER,
  streamingMessageId: null,
};

beforeEach(() => {
  useChatStore.setState(INITIAL_STATE);
});

describe("chatStore — initial state", () => {
  it("drawer is closed", () => {
    expect(useChatStore.getState().drawerOpen).toBe(false);
  });

  it("no conversation selected", () => {
    expect(useChatStore.getState().selectedConversationId).toBeNull();
  });

  it("default model is set", () => {
    expect(useChatStore.getState().activeModel).toBe(DEFAULT_MODEL);
  });

  it("default provider is set", () => {
    expect(useChatStore.getState().activeProvider).toBe(DEFAULT_PROVIDER);
  });

  it("no streaming message", () => {
    expect(useChatStore.getState().streamingMessageId).toBeNull();
  });
});

describe("chatStore — drawer", () => {
  it("openDrawer sets drawerOpen to true", () => {
    useChatStore.getState().openDrawer();
    expect(useChatStore.getState().drawerOpen).toBe(true);
  });

  it("closeDrawer sets drawerOpen to false", () => {
    useChatStore.setState({ drawerOpen: true });
    useChatStore.getState().closeDrawer();
    expect(useChatStore.getState().drawerOpen).toBe(false);
  });

  it("toggleDrawer flips the value", () => {
    useChatStore.getState().toggleDrawer();
    expect(useChatStore.getState().drawerOpen).toBe(true);
    useChatStore.getState().toggleDrawer();
    expect(useChatStore.getState().drawerOpen).toBe(false);
  });
});

describe("chatStore — selectConversation", () => {
  it("sets selectedConversationId", () => {
    useChatStore.getState().selectConversation("conv-123");
    expect(useChatStore.getState().selectedConversationId).toBe("conv-123");
  });

  it("can be cleared to null", () => {
    useChatStore.setState({ selectedConversationId: "conv-123" });
    useChatStore.getState().selectConversation(null);
    expect(useChatStore.getState().selectedConversationId).toBeNull();
  });
});

describe("chatStore — model and provider", () => {
  it("setModel updates activeModel", () => {
    useChatStore.getState().setModel("phi4:latest");
    expect(useChatStore.getState().activeModel).toBe("phi4:latest");
  });

  it("setProvider updates activeProvider", () => {
    useChatStore.getState().setProvider("openai");
    expect(useChatStore.getState().activeProvider).toBe("openai");
  });
});

describe("chatStore — streamingMessageId", () => {
  it("setStreamingMessageId sets the id", () => {
    useChatStore.getState().setStreamingMessageId("msg-abc");
    expect(useChatStore.getState().streamingMessageId).toBe("msg-abc");
  });

  it("can be cleared to null", () => {
    useChatStore.setState({ streamingMessageId: "msg-abc" });
    useChatStore.getState().setStreamingMessageId(null);
    expect(useChatStore.getState().streamingMessageId).toBeNull();
  });
});
