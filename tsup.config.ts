import { defineConfig, type Options } from "tsup";

// Load the same Koishi CommonJS module in both formats; Node's ESM Koishi Loader
// cannot be relied on by a plugin that is also loaded by the CommonJS loader.
const koishiInterop: NonNullable<Options["esbuildPlugins"]>[number] = {
  name: "koishi-commonjs-interop",
  setup(build) {
    build.onResolve({ filter: /^koishi$/ }, () => build.initialOptions.format === "esm"
      ? { path: "koishi", namespace: "koishi-cjs" }
      : { path: "koishi", external: true });
    build.onLoad({ filter: /.*/, namespace: "koishi-cjs" }, () => ({
      contents: `import { createRequire } from "node:module";
const koishi = createRequire(import.meta.url)("koishi");
export const { Context, Schema, Service, Time, Logger, version, h } = koishi;`,
      loader: "js",
    }));
  },
};

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "lib", format: ["cjs", "esm"], dts: true, splitting: false,
  sourcemap: true, clean: true, external: ["cocofaith-sdk"],
  noExternal: ["koishi"], esbuildPlugins: [koishiInterop],
});
