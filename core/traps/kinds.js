export const KINDS = {};

export function defineTrap(id, impl) {
  KINDS[id] = impl;
  return impl;
}
