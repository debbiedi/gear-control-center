// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDeviceValue } from "./useDeviceValue";

/**
 * The device is read again after every command and polled besides. Without
 * this hook a slider would jump backwards mid-drag each time a reading landed,
 * and every intermediate position would be sent to the hardware.
 */
describe("useDeviceValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows what the device reported while nothing is being moved", () => {
    const { result, rerender } = renderHook(
      ({ remote }) => useDeviceValue(remote, () => {}),
      { initialProps: { remote: 40 } },
    );
    expect(result.current[0]).toBe(40);

    rerender({ remote: 55 });

    expect(result.current[0]).toBe(55);
  });

  it("keeps the hand's position while the device is still reporting the old one", () => {
    const { result, rerender } = renderHook(
      ({ remote }) => useDeviceValue(remote, () => {}),
      { initialProps: { remote: 40 } },
    );

    act(() => result.current[1](70));
    // A poll lands mid-drag carrying the value from before the move.
    rerender({ remote: 40 });

    expect(result.current[0]).toBe(70);
  });

  it("sends one command for a drag, not one per pixel", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDeviceValue<number>(40, commit));

    act(() => {
      result.current[1](41);
      result.current[1](42);
      result.current[1](43);
    });
    expect(commit).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(200));

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(43);
  });

  it("goes back to following the device once the write has settled", async () => {
    const { result, rerender } = renderHook(
      ({ remote }) => useDeviceValue(remote, () => Promise.resolve()),
      { initialProps: { remote: 40 } },
    );

    act(() => result.current[1](70));
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    rerender({ remote: 71 });

    expect(result.current[0]).toBe(71);
  });
});
