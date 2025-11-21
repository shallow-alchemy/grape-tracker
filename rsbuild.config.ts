import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

const { publicVars } = loadEnv();

export default defineConfig({
  // Temporarily disable type checking to test runtime behavior
  plugins: [pluginReact()], // pluginTypeCheck() disabled
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
