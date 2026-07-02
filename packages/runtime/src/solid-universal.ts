import {
  createComponent,
  createMemo,
  createRenderEffect,
  createRoot,
  mergeProps,
  untrack,
} from "./solid-client.ts";

export interface RendererOptions<NodeType> {
  createElement(tag: string): NodeType;
  createTextNode(value: string): NodeType;
  replaceText(textNode: NodeType, value: string): void;
  isTextNode(node: NodeType): boolean;
  setProperty<T>(node: NodeType, name: string, value: T, prev?: T): void;
  insertNode(parent: NodeType, node: NodeType, anchor?: NodeType): void;
  removeNode(parent: NodeType, node: NodeType): void;
  getParentNode(node: NodeType): NodeType | undefined;
  getFirstChild(node: NodeType): NodeType | undefined;
  getNextSibling(node: NodeType): NodeType | undefined;
}

export interface Renderer<NodeType> {
  render(code: () => NodeType, node: NodeType): () => void;
  effect<T>(fn: (prev?: T) => T, init?: T): void;
  memo<T>(fn: () => T, equal?: boolean): () => T;
  createComponent<T>(Comp: (props: T) => NodeType, props: T): NodeType;
  createElement(tag: string): NodeType;
  createTextNode(value: string): NodeType;
  insertNode(parent: NodeType, node: NodeType, anchor?: NodeType): void;
  insert<T>(
    parent: NodeType,
    accessor: (() => T) | T,
    marker?: NodeType | null,
    initial?: unknown,
  ): NodeType;
  spread<T>(node: NodeType, accessor: (() => T) | T, skipChildren?: boolean): void;
  setProp<T>(node: NodeType, name: string, value: T, prev?: T): T;
  mergeProps(...sources: unknown[]): unknown;
  use<A, T>(fn: (element: NodeType, arg: A) => T, element: NodeType, arg: A): T;
}

const memo = <T>(fn: () => T) => createMemo(() => fn());

export function createRenderer<NodeType>({
  createElement,
  createTextNode,
  isTextNode,
  replaceText,
  insertNode,
  removeNode,
  setProperty,
  getParentNode,
  getFirstChild,
  getNextSibling,
}: RendererOptions<NodeType>): Renderer<NodeType> {
  function insert(
    parent: NodeType,
    accessor: unknown,
    marker?: NodeType | null,
    initial?: unknown,
  ): NodeType {
    if (marker !== undefined && !initial) initial = [];
    if (typeof accessor !== "function")
      return insertExpression(parent, accessor, initial, marker) as NodeType;
    createRenderEffect(
      (current: unknown) =>
        insertExpression(parent, (accessor as () => unknown)(), current, marker),
      initial,
    );
    return parent;
  }

  function insertExpression(
    parent: NodeType,
    value: unknown,
    current?: unknown,
    marker?: NodeType | null,
    unwrapArray?: boolean,
  ): unknown {
    while (typeof current === "function") current = (current as () => unknown)();
    if (value === current) return current;

    const valueType = typeof value;
    const multi = marker !== undefined;

    if (valueType === "string" || valueType === "number") {
      const text = valueType === "number" ? String(value) : (value as string);
      if (multi) {
        let node = (current as NodeType[] | undefined)?.[0];
        if (node && isTextNode(node)) replaceText(node, text);
        else node = createTextNode(text);
        current = cleanChildren(parent, current as NodeType[] | undefined, marker, node);
      } else if (current !== "" && typeof current === "string") {
        const first = getFirstChild(parent);
        if (first) replaceText(first, text);
        current = text;
      } else {
        cleanChildren(parent, current, marker, createTextNode(text));
        current = text;
      }
    } else if (value == null || valueType === "boolean") {
      current = cleanChildren(parent, current, marker);
    } else if (valueType === "function") {
      createRenderEffect(() => {
        let v = (value as () => unknown)();
        while (typeof v === "function") v = (v as () => unknown)();
        current = insertExpression(parent, v, current, marker);
      });
      return () => current;
    } else if (Array.isArray(value)) {
      const array: NodeType[] = [];
      if (normalizeIncomingArray(array, value, unwrapArray)) {
        createRenderEffect(() => {
          current = insertExpression(parent, array, current, marker, true);
        });
        return () => current;
      }
      if (array.length === 0) {
        const replacement = cleanChildren(parent, current, marker);
        if (multi) return (current = replacement);
      } else if (Array.isArray(current)) {
        if (current.length === 0) appendNodes(parent, array, marker);
        else reconcileArrays(parent, current as NodeType[], array);
      } else if (current == null || current === "") {
        appendNodes(parent, array, marker);
      } else {
        const first = getFirstChild(parent);
        reconcileArrays(
          parent,
          (multi && (current as NodeType[])) || (first ? [first] : []),
          array,
        );
      }
      current = array;
    } else {
      const node = value as NodeType;
      if (Array.isArray(current)) {
        if (multi) return (current = cleanChildren(parent, current, marker, node));
        cleanChildren(parent, current, null, node);
      } else if (current == null || current === "" || !getFirstChild(parent)) {
        insertNode(parent, node);
      } else {
        const first = getFirstChild(parent);
        if (first) replaceNode(parent, node, first);
      }
      current = node;
    }

    return current;
  }

  function normalizeIncomingArray(
    normalized: NodeType[],
    array: unknown[],
    unwrap?: boolean,
  ): boolean {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i];
      let t: string;
      if (item == null || item === true || item === false) {
        continue;
      } else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray(normalized, item) || dynamic;
      } else if ((t = typeof item) === "string" || t === "number") {
        normalized.push(createTextNode(String(item)));
      } else if (t === "function") {
        if (unwrap) {
          while (typeof item === "function") item = (item as () => unknown)();
          dynamic =
            normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item]) || dynamic;
        } else {
          normalized.push(item as NodeType);
          dynamic = true;
        }
      } else {
        normalized.push(item as NodeType);
      }
    }
    return dynamic;
  }

  function reconcileArrays(parentNode: NodeType, a: NodeType[], b: NodeType[]): void {
    let bLength = b.length;
    let aEnd = a.length;
    let bEnd = bLength;
    let aStart = 0;
    let bStart = 0;
    const after = getNextSibling(a[aEnd - 1]!);
    let map: Map<NodeType, number> | null = null;

    while (aStart < aEnd || bStart < bEnd) {
      if (a[aStart] === b[bStart]) {
        aStart++;
        bStart++;
        continue;
      }
      while (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--;
        bEnd--;
      }
      if (aEnd === aStart) {
        const node =
          bEnd < bLength ? (bStart ? getNextSibling(b[bStart - 1]!) : b[bEnd - bStart]) : after;
        while (bStart < bEnd) insertNode(parentNode, b[bStart++]!, node);
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart]!)) removeNode(parentNode, a[aStart]!);
          aStart++;
        }
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = getNextSibling(a[--aEnd]!);
        insertNode(parentNode, b[bStart++]!, getNextSibling(a[aStart++]!));
        insertNode(parentNode, b[--bEnd]!, node);
        a[aEnd] = b[bEnd]!;
      } else {
        if (!map) {
          map = new Map();
          let i = bStart;
          while (i < bEnd) map.set(b[i]!, i++);
        }
        const index = map.get(a[aStart]!);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart;
            let sequence = 1;
            let t: number | undefined;
            while (++i < aEnd && i < bEnd) {
              t = map.get(a[i]!);
              if (t == null || t !== index + sequence) break;
              sequence++;
            }
            if (sequence > index - bStart) {
              const node = a[aStart]!;
              while (bStart < index) insertNode(parentNode, b[bStart++]!, node);
            } else {
              replaceNode(parentNode, b[bStart++]!, a[aStart++]!);
            }
          } else {
            aStart++;
          }
        } else {
          removeNode(parentNode, a[aStart++]!);
        }
      }
    }
  }

  function cleanChildren(
    parent: NodeType,
    current: unknown,
    marker?: NodeType | null,
    replacement?: NodeType,
  ): unknown {
    if (marker === undefined) {
      let removed: NodeType | undefined;
      while ((removed = getFirstChild(parent))) removeNode(parent, removed);
      if (replacement) insertNode(parent, replacement);
      return "";
    }

    const node = replacement || createTextNode("");
    const currentArray = Array.isArray(current) ? current : [];
    if (currentArray.length) {
      let inserted = false;
      for (let i = currentArray.length - 1; i >= 0; i--) {
        const el = currentArray[i]!;
        if (node !== el) {
          const isParent = getParentNode(el) === parent;
          if (!inserted && !i) {
            if (isParent) replaceNode(parent, node, el);
            else insertNode(parent, node, marker ?? undefined);
          } else if (isParent) {
            removeNode(parent, el);
          }
        } else {
          inserted = true;
        }
      }
    } else {
      insertNode(parent, node, marker ?? undefined);
    }
    return [node];
  }

  function appendNodes(parent: NodeType, array: NodeType[], marker?: NodeType | null): void {
    for (let i = 0, len = array.length; i < len; i++)
      insertNode(parent, array[i]!, marker ?? undefined);
  }

  function replaceNode(parent: NodeType, newNode: NodeType, oldNode: NodeType): void {
    insertNode(parent, newNode, oldNode);
    removeNode(parent, oldNode);
  }

  function spreadExpression(
    node: NodeType,
    props: Record<string, unknown> | undefined,
    prevProps: Record<string, unknown> = {},
    skipChildren?: boolean,
  ): Record<string, unknown> {
    props ||= {};
    if (!skipChildren) {
      createRenderEffect(() => {
        prevProps.children = insertExpression(node, props.children, prevProps.children);
      });
    }
    createRenderEffect(() => {
      if (typeof props.ref === "function") (props.ref as (node: NodeType) => void)(node);
    });
    createRenderEffect(() => {
      for (const prop in props) {
        if (prop === "children" || prop === "ref") continue;
        const value = props[prop];
        if (value === prevProps[prop]) continue;
        setProperty(node, prop, value, prevProps[prop]);
        prevProps[prop] = value;
      }
    });
    return prevProps;
  }

  return {
    render(code, element) {
      let disposer: (() => void) | undefined;
      createRoot((dispose: () => void) => {
        disposer = dispose;
        insert(element, code());
      });
      return () => disposer?.();
    },
    insert,
    spread(node, accessor, skipChildren) {
      if (typeof accessor === "function") {
        createRenderEffect((current: Record<string, unknown> | undefined) =>
          spreadExpression(
            node,
            (accessor as () => Record<string, unknown>)(),
            current,
            skipChildren,
          ),
        );
      } else {
        spreadExpression(node, accessor as Record<string, unknown>, undefined, skipChildren);
      }
    },
    createElement,
    createTextNode,
    insertNode,
    setProp(node, name, value, prev) {
      setProperty(node, name, value, prev);
      return value;
    },
    mergeProps,
    effect: createRenderEffect,
    memo,
    createComponent: createComponent as never,
    use(fn, element, arg) {
      return untrack(() => fn(element, arg));
    },
  };
}
