import { describe, it, expect } from "vitest";
import {
  getDayPeriodByHour,
  getWelcomeMessagesByHour,
  getWelcomeMessageByHour,
} from ".";

describe("welcomeMessages", () => {
  it("maps hour to morning period", () => {
    expect(getDayPeriodByHour(5)).toBe("morning");
    expect(getDayPeriodByHour(11)).toBe("morning");
  });

  it("maps hour to afternoon period", () => {
    expect(getDayPeriodByHour(12)).toBe("afternoon");
    expect(getDayPeriodByHour(18)).toBe("afternoon");
  });

  it("maps hour to night period", () => {
    expect(getDayPeriodByHour(0)).toBe("night");
    expect(getDayPeriodByHour(4)).toBe("night");
    expect(getDayPeriodByHour(23)).toBe("night");
  });

  it("selects deterministic message based on hour", () => {
    const morningMessages = getWelcomeMessagesByHour(8);
    expect(getWelcomeMessageByHour(8)).toEqual(morningMessages[0]);
  });

  it("normalizes out-of-range hours and keeps deterministic selection", () => {
    const afternoonMessages = getWelcomeMessagesByHour(14);
    expect(getWelcomeMessageByHour(14)).toEqual(afternoonMessages[2]);
    expect(getWelcomeMessageByHour(38)).toEqual(afternoonMessages[2]);
  });

  it("changes message inside the same period when seed changes", () => {
    const afternoonMessages = getWelcomeMessagesByHour(14);
    expect(getWelcomeMessageByHour(14, 0)).toEqual(afternoonMessages[2]);
    expect(getWelcomeMessageByHour(14, 1)).toEqual(afternoonMessages[3]);
    expect(getWelcomeMessageByHour(14, 2)).toEqual(afternoonMessages[0]);
  });
});
