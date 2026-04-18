import path from 'node:path';

import { defineConfig } from 'vitest/config';

const workspacePackage = (name: string) =>
  path.resolve(__dirname, `../../packages/${name}/src/index.ts`);

export default defineConfig({
  resolve: {
    alias: {
      '@cobrazap/config': workspacePackage('config'),
      '@cobrazap/db': workspacePackage('db'),
      '@cobrazap/domain': workspacePackage('domain'),
      '@cobrazap/integrations': workspacePackage('integrations'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});
