import type { Language } from "./language";

export default [
  {
    key: "en",
    nativeName: "English",
    prefix: "EN-US",
  },
] as const satisfies Language[];
