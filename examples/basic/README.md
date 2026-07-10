# basic

Minimal solid-tui application written as Solid TSX.

```sh
pnpm dev      # Vite terminal dev server with HMR
pnpm build    # self-contained dist/main.mjs via tsdown
pnpm preview
```

Development uses `solidTui()` in `vite.config.ts`. Production uses
`unplugin-solid/rolldown` in `tsdown.config.ts`; both compile JSX with Solid's universal renderer.
