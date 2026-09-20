import { currentCookies } from "./control.mjs";

export async function cookies() {
  const store = currentCookies();
  return {
    get(name) {
      return store.has(name) ? { name, value: store.get(name) } : undefined;
    }
  };
}
