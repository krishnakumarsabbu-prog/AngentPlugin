const esbuild = require("esbuild");
const path = require("path");

const production = process.argv.includes("--production");

esbuild
  .build({
    entryPoints: [path.join(__dirname, "src", "extension.ts")],
    bundle: true,
    outfile: path.join(__dirname, "out", "extension.js"),
    external: ["vscode"],
    format: "cjs",
    platform: "node",
    target: "node18",
    sourcemap: !production,
    minify: production,
    logLevel: "info",
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
