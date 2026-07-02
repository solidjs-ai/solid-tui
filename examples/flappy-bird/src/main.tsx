// Flappy Bird example for @solid-tui/runtime.
//
// Controls: space / up arrow / w to flap, q or Ctrl-C to quit, r to restart after dying.

import { createApp } from "@solid-tui/runtime";
import App from "./app.tsx";

createApp(App).mount();
