import { describe, expect, it } from "vitest";
import { EventType, type TextMessageStartEvent, type MessagesSnapshotEvent } from "@ag-ui/core";
import { decode, encode } from "../proto";

// Every JSON shape the protocol promises must survive the binary transport.
const VALUE_SHAPES = {
  nullValue: null,
  string: "finish_reason",
  number: 42,
  float: 1.5,
  boolean: true,
  emptyArray: [],
  array: [1, "two", null, { nested: true }],
  emptyObject: {},
  nested: { usage: { input: 10, output: 20 }, tags: ["a", "b"] },
};

const roundTrip = (event: any) => decode(encode(event)) as any;

describe("metadata over the binary transport", () => {
  it("survives a round trip with every value shape intact", () => {
    const decoded = roundTrip({
      type: EventType.TEXT_MESSAGE_START,
      messageId: "m1",
      role: "assistant",
      metadata: VALUE_SHAPES,
    } as TextMessageStartEvent);

    expect(decoded.metadata).toEqual(VALUE_SHAPES);
  });

  it("keeps an absent object absent rather than decoding it as empty", () => {
    const decoded = roundTrip({
      type: EventType.TEXT_MESSAGE_START,
      messageId: "m1",
      role: "assistant",
    } as TextMessageStartEvent);

    expect(decoded.metadata).toBeUndefined();
  });

  it("distinguishes an empty object from an absent one", () => {
    const decoded = roundTrip({
      type: EventType.TEXT_MESSAGE_START,
      messageId: "m1",
      role: "assistant",
      metadata: {},
    } as TextMessageStartEvent);

    expect(decoded.metadata).toEqual({});
    expect(decoded.metadata).not.toBeUndefined();
  });

  it("preserves a null value under a key", () => {
    const decoded = roundTrip({
      type: EventType.TEXT_MESSAGE_START,
      messageId: "m1",
      role: "assistant",
      metadata: { finishReason: null },
    } as TextMessageStartEvent);

    expect(decoded.metadata).toEqual({ finishReason: null });
    expect("finishReason" in decoded.metadata).toBe(true);
  });

  it("carries metadata on a non-message event", () => {
    const decoded = roundTrip({
      type: EventType.RUN_FINISHED,
      threadId: "t1",
      runId: "r1",
      metadata: { usage: { total: 100 } },
    });

    expect(decoded.metadata).toEqual({ usage: { total: 100 } });
  });

  it("carries per-message metadata through a messages snapshot", () => {
    const decoded = roundTrip({
      type: EventType.MESSAGES_SNAPSHOT,
      messages: [
        { id: "m1", role: "assistant", content: "a", metadata: VALUE_SHAPES },
        { id: "m2", role: "assistant", content: "b" },
      ],
    } as MessagesSnapshotEvent);

    expect(decoded.messages[0].metadata).toEqual(VALUE_SHAPES);
    // The second message had none and must not gain any.
    expect(decoded.messages[1].metadata).toBeUndefined();
  });
});

describe("tool call metadata over the binary transport", () => {
  it("round-trips per tool call and keeps them independent", () => {
    const decoded = roundTrip({
      type: EventType.MESSAGES_SNAPSHOT,
      messages: [
        {
          id: "m1",
          role: "assistant",
          content: "",
          toolCalls: [
            {
              id: "tc1",
              type: "function",
              function: { name: "a", arguments: "{}" },
              metadata: VALUE_SHAPES,
            },
            // Carries none, so a leak between tool calls would surface.
            { id: "tc2", type: "function", function: { name: "b", arguments: "{}" } },
          ],
        },
      ],
    });

    expect(decoded.messages[0].toolCalls[0].metadata).toEqual(VALUE_SHAPES);
    expect(decoded.messages[0].toolCalls[1].metadata).toBeUndefined();
  });
});
