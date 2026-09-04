import { defineConfig } from "tsup";
export default defineConfig({ entry: ["src/index.ts"], outDir: "lib", format: ["cjs", "esm"], dts: true, splitting: false, sourcemap: true, clean: true, external: ["koishi", "@mueo/koishi-plugin-cocofaith-core", "@mueo/koishi-plugin-cocofaith-business"] });
