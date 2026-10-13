import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);

export function readSource(rel) {
  return readFileSync(new URL(rel, root), 'utf8');
}

// Runs classic (non-module) scripts the way the browser does: one shared global scope.
export function loadScripts(files, globals = {}) {
  const context = vm.createContext({ console, ...globals });
  context.window = context;
  context.globalThis = context;
  for (const file of files) vm.runInContext(readSource(file), context, { filename: file });
  return context;
}
