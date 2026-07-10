import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
  type Accessor,
} from "../solid-client.ts";
import { AppContextKey } from "../context.ts";
import { resolveTuiNode } from "../host/resolve-node.ts";
import type { TuiMouseEvent } from "../mouse/events.ts";

export interface UseDraggablePosition {
  readonly x: number;
  readonly y: number;
}

export type UseDraggableAxis = "x" | "y" | "both";
export type UseDraggableTarget = Accessor<unknown>;

export interface UseDraggableOptions {
  initialValue?: UseDraggablePosition;
  axis?: UseDraggableAxis;
  onStart?: (position: UseDraggablePosition, event: TuiMouseEvent) => void;
  onMove?: (position: UseDraggablePosition, event: TuiMouseEvent) => void;
  onEnd?: (position: UseDraggablePosition, event: TuiMouseEvent) => void;
}

export interface UseDraggableReturn {
  readonly x: Accessor<number>;
  readonly y: Accessor<number>;
  readonly position: Accessor<UseDraggablePosition>;
  readonly isDragging: Accessor<boolean>;
}

/**
 * Track pointer dragging for a host ref accessor. Solid assigns refs before the
 * first effect runs, so registration needs no mount tick or component-instance lookup.
 */
export function useDraggable(
  target: UseDraggableTarget,
  options: UseDraggableOptions = {},
): UseDraggableReturn {
  const app = useContext(AppContextKey);
  if (!app) throw new Error("useDraggable() must be called inside a solid-tui render tree");

  const [x, setX] = createSignal(options.initialValue?.x ?? 0);
  const [y, setY] = createSignal(options.initialValue?.y ?? 0);
  const position = createMemo<UseDraggablePosition>(() => ({ x: x(), y: y() }));
  const [isDragging, setIsDragging] = createSignal(false);
  const axis = options.axis ?? "both";
  let unregister: (() => void) | undefined;
  let startPosition: UseDraggablePosition = position();
  let startPointer: UseDraggablePosition = { x: 0, y: 0 };

  function clearRegistration() {
    unregister?.();
    unregister = undefined;
    setIsDragging(false);
  }

  function updatePosition(event: TuiMouseEvent) {
    const nextX = startPosition.x + event.screenX - startPointer.x;
    const nextY = startPosition.y + event.screenY - startPointer.y;
    if (axis !== "y") setX(nextX);
    if (axis !== "x") setY(nextY);
  }

  createEffect(() => {
    const node = resolveTuiNode(target());
    if (!node) return;

    unregister = app.internal_mouse?.registerDraggable(node, {
      onStart(event) {
        const result = options.onStart?.(position(), event) as unknown;
        if (result === false) return false;
        startPosition = position();
        startPointer = { x: event.screenX, y: event.screenY };
        setIsDragging(true);
      },
      onMove(event) {
        updatePosition(event);
        options.onMove?.(position(), event);
      },
      onEnd(event) {
        updatePosition(event);
        setIsDragging(false);
        options.onEnd?.(position(), event);
      },
      onCancel() {
        setIsDragging(false);
      },
    });

    onCleanup(clearRegistration);
  });

  return { x, y, position, isDragging };
}
