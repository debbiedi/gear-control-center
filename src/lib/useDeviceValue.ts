import { useEffect, useRef, useState } from "react";

/**
 * Hold a control's value locally while the user is moving it.
 *
 * Every command is followed by a fresh read from the device, and the device is
 * polled besides. Without this, a slider would jump backwards mid-drag each
 * time a poll landed. The local value wins until the write settles, then the
 * device's own answer takes over again — so what ends up on screen is still
 * what the hardware reported, not what the interface hoped for.
 */
export function useDeviceValue<T>(
  remote: T,
  commit: (value: T) => void | Promise<void>,
  delayMs = 90,
) {
  const [local, setLocal] = useState(remote);
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!dirty.current) setLocal(remote);
  }, [remote]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const set = (value: T) => {
    setLocal(value);
    dirty.current = true;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void Promise.resolve(commit(value)).finally(() => {
        dirty.current = false;
      });
    }, delayMs);
  };

  return [local, set] as const;
}
