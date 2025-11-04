import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const { publicVars } = loadEnv();

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    template: './index.html',
  },
  output: {
    cssModules: {
      auto: true,
      localIdentName: '[local]_[hash:base64:5]',
    },
  },
  source: {
    define: publicVars,
  },
});
