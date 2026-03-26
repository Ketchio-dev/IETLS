import { existsSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

function findTurbopackRoot(startDir: string) {
  let currentDir = startDir;

  while (true) {
    if (existsSync(path.join(currentDir, 'node_modules', 'next', 'package.json'))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return startDir;
    }

    currentDir = parentDir;
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: findTurbopackRoot(path.resolve(__dirname)),
    ignoreIssue: [
      {
        path: /next\.config\.ts$/,
        title: /^Encountered unexpected file in NFT list$/,
      },
    ],
  },
};

export default nextConfig;
