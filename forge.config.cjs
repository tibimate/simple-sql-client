const path = require("node:path");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const { MakerDeb } = require("@electron-forge/maker-deb");
const { MakerRpm } = require("@electron-forge/maker-rpm");
const { MakerWix } = require("@electron-forge/maker-wix");
const { MakerSquirrel } = require("@electron-forge/maker-squirrel");
const { MakerZIP } = require("@electron-forge/maker-zip");
const {
  AutoUnpackNativesPlugin,
} = require("@electron-forge/plugin-auto-unpack-natives");
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { VitePlugin } = require("@electron-forge/plugin-vite");

const projectRoot = process.cwd();

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
const config = {
  packagerConfig: {
    asar: {
      unpack: "**/node_modules/{better-sqlite3,pg,mysql2,pg-types,sql-escaper/**}",
      //unpack: "**/*.{node,dll}",
    },
    ignore: [
      /^\/\.git($|\/)/,
      /^\/\.github($|\/)/,
      /^\/\.vscode($|\/)/,
      /^\/out($|\/)/,
      /^\/scripts($|\/)/,
      /^\/src($|\/)/,
      /^\/tests?($|\/)/,
      /^\/coverage($|\/)/,
      /^\/README\.md$/,
      /^\/tsconfig\.json$/,
      /^\/vitest\.config\.ts$/,
    ],
    icon: path.join(projectRoot, "resources", "icon"),
  },
  rebuildConfig: {
    onlyModules: ["better-sqlite3", "pg", "mysql2"],
  },
  makers: [
    new MakerWix({
      icon: path.join(projectRoot, "resources", "icon.ico"),
      language: 1033,
      manufacturer: "tibimate",
      ui: {
        chooseDirectory: true,
      },
    }),
    new MakerSquirrel({}),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "tibimate",
          name: "simple-sql-client",
        },
        draft: true,
        prerelease: false,
      },
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.mts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.mts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

module.exports = config;
