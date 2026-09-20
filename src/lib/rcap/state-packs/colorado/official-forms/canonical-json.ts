// One serialisation, so a hash means something.
//
// A specification hash that changed when a key moved would be a hash of the
// formatting rather than of the meaning, and every reader would learn to
// ignore it. This writes objects with their keys sorted, arrays in order, two
// spaces of indent and a closing newline — the same text for the same value,
// from any run.
//
// It is deliberately narrow: a value it cannot represent exactly throws rather
// than being coerced, because a specification that silently serialised
// `undefined` as `null` would hash the same as one that meant `null`.

type Serialisable =
  | string
  | number
  | boolean
  | null
  | readonly Serialisable[]
  | { readonly [key: string]: Serialisable };

function assertFinite(value: number, path: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`canonical JSON: ${path} is ${String(value)}, which has no exact representation`);
  }
}

function render(value: unknown, path: string, indent: string): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    assertFinite(value, path);
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const inner = indent + "  ";
    const parts = value.map((entry, index) => inner + render(entry, `${path}[${index}]`, inner));
    return `[\n${parts.join(",\n")}\n${indent}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
    if (keys.length === 0) return "{}";
    const inner = indent + "  ";
    const parts = keys.map(
      (key) => `${inner}${JSON.stringify(key)}: ${render(record[key], `${path}.${key}`, inner)}`,
    );
    return `{\n${parts.join(",\n")}\n${indent}}`;
  }

  throw new TypeError(`canonical JSON: ${path} is a ${typeof value}, which cannot be serialised`);
}

/** Deterministic JSON text, keys sorted, ending in a newline. */
export function canonicalJson(value: Serialisable): string {
  return `${render(value, "$", "")}\n`;
}
