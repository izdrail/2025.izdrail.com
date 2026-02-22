"use client";

import { useChat } from "@ai-sdk/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ThreadPrimitive,
  MessagePrimitive,
  AuiIf,
} from "@assistant-ui/react";
import { ArrowUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ThreadWelcome = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <h2 className="text-2xl font-semibold mb-2">Hello there!</h2>
      <p className="text-muted-foreground text-lg mb-6">
        How can I help you today?
      </p>
    </div>
  );
};

const ThreadMessages = () => {
  return (
    <ThreadPrimitive.Messages
      components={{
        UserMessage: () => (
          <MessagePrimitive.Root
            className="flex flex-col items-end gap-2 px-4 py-3"
            data-role="user"
          >
            <div className="rounded-2xl bg-muted px-4 py-2.5 max-w-[80%]">
              <MessagePrimitive.Parts />
            </div>
          </MessagePrimitive.Root>
        ),
        AssistantMessage: () => (
          <MessagePrimitive.Root
            className="flex flex-col items-start gap-2 px-4 py-3"
            data-role="assistant"
          >
            <div className="rounded-2xl px-4 py-2.5 max-w-[80%]">
              <MessagePrimitive.Parts />
            </div>
          </MessagePrimitive.Root>
        ),
      }}
    />
  );
};

const Composer = () => {
  return (
    <ComposerPrimitive.Root className="flex w-full flex-col rounded-2xl border border-input bg-background px-1 pt-2 outline-none focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
      <ComposerPrimitive.Input
        placeholder="Send a message..."
        className="mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
        rows={1}
        autoFocus
      />
      <div className="flex items-center justify-end mx-2 mb-2">
        <ComposerPrimitive.Send asChild>
          <Button
            type="submit"
            variant="default"
            size="icon"
            className="size-8 rounded-full"
          >
            <ArrowUpIcon className="size-4" />
          </Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const Thread = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>
        <ThreadMessages />
      </ThreadPrimitive.Viewport>
      <div className="p-4">
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  );
};

export default function AssistantChat() {
  const chat = useChat();
  const runtime = useAISDKRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
