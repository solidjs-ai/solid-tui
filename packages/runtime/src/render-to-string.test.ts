import { expect, test } from "vite-plus/test";
import { Box, Static, Text, createComponent, renderToString } from "./index.ts";

test("renderToString renders text output", () => {
  expect(renderToString(() => createComponent(Text, { children: "hello" }))).toBe("hello");
});

test("renderToString respects layout width", () => {
  const out = renderToString(
    () =>
      createComponent(Box, {
        flexDirection: "column",
        width: 5,
        get children() {
          return createComponent(Text, { wrap: "wrap", children: "hello world" });
        },
      }),
    { columns: 5 },
  );
  expect(out).toContain("hello");
});

test("renderToString prepends Static output", () => {
  const out = renderToString(() =>
    createComponent(Box, {
      flexDirection: "column",
      get children() {
        return [
          createComponent(Static, {
            items: ["done"],
            children: ({ item }: { item: string }) => createComponent(Text, { children: item }),
          }),
          createComponent(Text, { children: "tail" }),
        ];
      },
    }),
  );

  expect(out).toContain("done");
  expect(out).toContain("tail");
});
