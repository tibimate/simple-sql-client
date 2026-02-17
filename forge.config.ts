import path from "node:path";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import type { ForgeConfig } from "@electron-forge/shared-types";

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "**/node_modules/{better-sqlite3,pg,mysql2,mysql2/**}",
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: [
    {
      /*
       * Publish release on GitHub as draft.
       * Remember to manually publish it on GitHub website after verifying everything is correct.
       */
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
  hooks: {
    postPackage: async (_config, packageResult) => {
      const fs = await import("node:fs");
      const os = await import("node:os");
      const srcModules = path.join(import.meta.dirname, "node_modules");
      const appPath = packageResult.outputPaths[0];
      const platform = os.platform();

      let destModules: string;

      if (platform === "darwin") {
        // macOS: .app bundle structure
        const appName = "Simple SQL Client.app";
        destModules = path.join(
          appPath,
          appName,
          "Contents/Resources/node_modules"
        );
      } else if (platform === "win32") {
        // Windows: resources folder
        destModules = path.join(appPath, "resources", "node_modules");
      } else {
        // Linux: resources folder
        destModules = path.join(appPath, "resources", "node_modules");
      }

      if (!fs.existsSync(destModules)) {
        fs.cpSync(srcModules, destModules, { recursive: true });
        console.log(
          `Copied all node_modules to packaged app at ${destModules}`
        );
      }
    },
  },
};

export default config;
