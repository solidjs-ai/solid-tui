import {
  createEffect,
  createSignal,
  onCleanup,
  useContext,
  type Accessor,
} from "../solid-client.ts";
import {
  createAnimationScheduler,
  normalizeInterval,
  type AnimationScheduler,
} from "../animation-scheduler.ts";
import { AnimationSchedulerKey } from "../context.ts";

export interface UseAnimationOptions {
  interval?: number | (() => number | undefined);
  isActive?: boolean | (() => boolean);
}

export interface UseAnimationReturn {
  readonly frame: Accessor<number>;
  readonly time: Accessor<number>;
  readonly delta: Accessor<number>;
  readonly reset: () => void;
}

const read = <T>(value: T | (() => T)): T =>
  typeof value === "function" ? (value as () => T)() : value;

export function useAnimation(options: UseAnimationOptions = {}): UseAnimationReturn {
  const [frame, setFrame] = createSignal(0);
  const [time, setTime] = createSignal(0);
  const [delta, setDelta] = createSignal(0);

  const scheduler: AnimationScheduler =
    useContext(AnimationSchedulerKey) ?? createAnimationScheduler();

  const renderThrottleMs = scheduler.renderThrottleMs;
  let interval = normalizeInterval(read(options.interval ?? 100));
  let handle: { startTime: number; unsubscribe: () => void } | undefined;
  let startTime = 0;
  let lastRenderedTime = 0;
  let nextRenderTime = 0;

  function tick(now: number) {
    if (renderThrottleMs > 0 && now < nextRenderTime) return;
    setFrame(Math.floor((now - startTime) / interval));
    setTime(now - startTime);
    setDelta(now - lastRenderedTime);
    lastRenderedTime = now;
    nextRenderTime = now + renderThrottleMs;
  }

  function stop() {
    handle?.unsubscribe();
    handle = undefined;
  }

  function start() {
    stop();
    setFrame(0);
    setTime(0);
    setDelta(0);
    handle = scheduler.subscribe(tick, interval);
    startTime = handle.startTime;
    lastRenderedTime = handle.startTime;
    nextRenderTime = handle.startTime + renderThrottleMs;
  }

  function reset() {
    if (handle) start();
  }

  createEffect((prev?: { active: boolean; interval: number }) => {
    const active = read(options.isActive ?? true);
    const nextInterval = normalizeInterval(read(options.interval ?? 100));
    const intervalChanged = prev !== undefined && nextInterval !== prev.interval;
    const becameActive = prev === undefined || !prev.active;
    interval = nextInterval;
    if (!active) {
      stop();
      return { active, interval };
    }
    if (becameActive || intervalChanged) start();
    return { active, interval };
  });

  onCleanup(stop);

  return { frame, time, delta, reset };
}
