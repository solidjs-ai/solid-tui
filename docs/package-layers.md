# Package Layers and Dependency Direction

The packages have strict ownership boundaries:

```text
runtime <- components

runtime <- testing
runtime <- vite (peer integration only)
```

- `@solid-tui/runtime` owns the custom renderer, Yoga host tree, primitive components, terminal I/O,
  and hooks tied to renderer capabilities such as input, focus, mouse, cursor, and window size.
- `@solid-tui/components` owns higher-level rendered features such as `Spinner` and `ScrollBox`. It
  composes only the public runtime API and never imports runtime internals.
- `@solid-tui/testing` is a development sidecar that mounts runtime apps against fake terminal
  streams. Runtime never depends on it.
- `@solid-tui/vite` is a development sidecar for compilation, in-process execution, and HMR. Runtime
  exposes only the small internal HMR bridge it consumes.

Dependencies point toward runtime, never back toward higher layers. A future package for independent
headless hooks should be introduced only when a concrete hook does not belong to terminal I/O or a
specific component.
