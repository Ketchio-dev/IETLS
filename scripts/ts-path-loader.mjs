import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidateExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveCandidate(basePath) {
  if (await exists(basePath)) {
    return basePath;
  }

  for (const extension of candidateExtensions) {
    if (await exists(`${basePath}${extension}`)) {
      return `${basePath}${extension}`;
    }
  }

  for (const extension of candidateExtensions) {
    const indexPath = path.join(basePath, `index${extension}`);
    if (await exists(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

async function resolveAlias(specifier) {
  return resolveCandidate(path.join(repoRoot, 'src', specifier.slice(2)));
}

async function resolveRelative(specifier, parentURL) {
  if (!parentURL?.startsWith('file:')) {
    return null;
  }

  const parentPath = fileURLToPath(parentURL);
  return resolveCandidate(path.resolve(path.dirname(parentPath), specifier));
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const resolvedPath = await resolveAlias(specifier);
    if (!resolvedPath) {
      throw new Error(`Unable to resolve alias specifier: ${specifier}`);
    }

    return {
      shortCircuit: true,
      url: pathToFileURL(resolvedPath).href,
    };
  }

  if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) {
    const resolvedPath = await resolveRelative(specifier, context.parentURL);
    if (resolvedPath) {
      return {
        shortCircuit: true,
        url: pathToFileURL(resolvedPath).href,
      };
    }
  }

  return nextResolve(specifier, context);
}
