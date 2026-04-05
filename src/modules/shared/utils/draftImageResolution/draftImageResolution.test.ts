import { describe, expect, it } from "vitest";
import { getDraftImageDimensions } from ".";

describe("getDraftImageDimensions", () => {
  it("returns 768x768 for 1024x1024 draft", () => {
    expect(getDraftImageDimensions(1024, 1024)).toEqual({ width: 768, height: 768 });
  });

  it("keeps both dimensions at least 512 when possible", () => {
    expect(getDraftImageDimensions(1024, 576)).toEqual({ width: 912, height: 512 });
    expect(getDraftImageDimensions(576, 1024)).toEqual({ width: 512, height: 912 });
  });

  it("never exceeds the requested dimensions", () => {
    expect(getDraftImageDimensions(512, 512)).toEqual({ width: 512, height: 512 });
  });
});

