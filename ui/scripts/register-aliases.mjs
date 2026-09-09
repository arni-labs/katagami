// Loaded with --import so the "@/…" prefix resolves for the whole test run.
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
