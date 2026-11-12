import { db } from "./db";
import { asBlocks, getEditor, isEmptyValue } from "./editors";
import { sanitizeRichText } from "./sanitize";
import { asObject, slugify, type JsonObject } from "./utils";

/**
 * Server-side helpers for document values: load types, clean/sanitize and validate.
 * (Kept out of the "use server" actions file, which may only export actions.)
 */

export async function loadDocType(id: string) {
  return db.documentType.findUnique({
    where: { id },
    include: { groups: { include: { properties: { include: { dataType: true } } } } },
  });
}

export type TypeWithProps = NonNullable<Awaited<ReturnType<typeof loadDocType>>>;
export type ElementMap = Map<string, TypeWithProps>;

/** Element Types are needed to validate/clean Block List values */
export async function loadElementTypes(): Promise<ElementMap> {
  const types = await db.documentType.findMany({
    where: { isElement: true },
    include: { groups: { include: { properties: { include: { dataType: true } } } } },
  });
  return new Map(types.map((t) => [t.id, t]));
}

export function validate(docType: TypeWithProps, values: JsonObject, elements: ElementMap): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const g of docType.groups) {
    for (const p of g.properties) {
      const v = values[p.alias];
      if (p.mandatory && isEmptyValue(v)) {
        errors[p.alias] = "Value cannot be empty";
        continue;
      }
      if (p.dataType.editorAlias === "Killer.BlockList") {
        const cfg = asObject(p.dataType.config);
        const blocks = asBlocks(v);
        const allowed = Array.isArray(cfg.blocks) ? (cfg.blocks as string[]) : [];
        if (Number(cfg.min) > 0 && blocks.length < Number(cfg.min)) errors[p.alias] = `Add at least ${cfg.min} block(s)`;
        if (Number(cfg.max) > 0 && blocks.length > Number(cfg.max)) errors[p.alias] = `At most ${cfg.max} block(s) are allowed`;
        blocks.forEach((b, i) => {
          if (errors[p.alias]) return;
          const et = elements.get(b.contentTypeId);
          if (!et) return void (errors[p.alias] = `Block ${i + 1} uses an Element Type that no longer exists`);
          if (allowed.length && !allowed.includes(et.id)) return void (errors[p.alias] = `Block ${i + 1}: ${et.name} is not allowed here`);
          const inner = validate(et, b.values, elements);
          const [alias, msg] = Object.entries(inner)[0] ?? [];
          if (alias) {
            const propName = et.groups.flatMap((x) => x.properties).find((x) => x.alias === alias)?.name ?? alias;
            errors[p.alias] = `Block ${i + 1} (${et.name}) › ${propName}: ${msg}`;
          }
        });
        continue;
      }
      if (typeof v === "string" && v && p.validationRegex) {
        try {
          if (!new RegExp(p.validationRegex).test(v)) errors[p.alias] = "Value is invalid, it does not match the correct pattern";
        } catch {
          /* bad regex configured — ignore */
        }
      }
      const cfg = asObject(p.dataType.config);
      if (p.dataType.editorAlias === "Killer.EmailAddress" && typeof v === "string" && v && !/^\S+@\S+\.\S+$/.test(v)) {
        errors[p.alias] = "Invalid email";
      }
      if (typeof v === "string" && Number(cfg.maxChars) > 0 && v.length > Number(cfg.maxChars)) {
        errors[p.alias] = `Maximum ${cfg.maxChars} characters`;
      }
      if (typeof v === "number") {
        if (cfg.min !== undefined && cfg.min !== null && cfg.min !== "" && v < Number(cfg.min)) errors[p.alias] = `Minimum is ${cfg.min}`;
        if (cfg.max !== undefined && cfg.max !== null && cfg.max !== "" && v > Number(cfg.max)) errors[p.alias] = `Maximum is ${cfg.max}`;
      }
      if (Array.isArray(v) && p.dataType.editorAlias === "Killer.MultipleTextString") {
        if (Number(cfg.max) > 0 && v.length > Number(cfg.max)) errors[p.alias] = `Maximum ${cfg.max} items`;
        if (Number(cfg.min) > 0 && v.length < Number(cfg.min)) errors[p.alias] = `Minimum ${cfg.min} items`;
      }
    }
  }
  return errors;
}

/**
 * Strip unknown aliases and label values so only defined properties are stored,
 * and sanitize Rich Text HTML (recursively inside blocks) to prevent stored XSS.
 */
export function cleanValues(docType: TypeWithProps, values: JsonObject, elements: ElementMap) {
  const out: JsonObject = {};
  for (const g of docType.groups)
    for (const p of g.properties) {
      const alias = getEditor(p.dataType.editorAlias).alias;
      if (alias === "Killer.Label" || values[p.alias] === undefined) continue;
      if (alias === "Killer.BlockList") {
        // Keep only blocks whose Element Type exists, and clean their values recursively
        out[p.alias] = asBlocks(values[p.alias]).flatMap((b) => {
          const et = elements.get(b.contentTypeId);
          if (!et) return [];
          return [{ key: b.key, contentTypeId: b.contentTypeId, values: cleanValues(et, b.values, elements), ...(b.hidden ? { hidden: true } : {}) }];
        });
        continue;
      }
      if (alias === "Killer.RichText") {
        out[p.alias] = sanitizeRichText(values[p.alias]);
        continue;
      }
      out[p.alias] = values[p.alias];
    }
  return out;
}

/** Clean + sanitize stored values of a document before showing them in the backoffice. */
export async function cleanStoredValues(documentTypeId: string, values: unknown) {
  const [type, elements] = await Promise.all([loadDocType(documentTypeId), loadElementTypes()]);
  return type ? cleanValues(type, asObject(values), elements) : asObject(values);
}

/**
 * URL segment that is unique among (non-trashed) siblings, so two pages never
 * resolve to the same route ("Hello World" and "Hello-World" → hello-world, hello-world-1).
 */
export async function uniqueSegment(name: string, parentId: string | null, excludeId?: string) {
  const base = slugify(name);
  const siblings = await db.document.findMany({
    where: { parentId, trashed: false, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { urlSegment: true },
  });
  const taken = new Set(siblings.map((s) => s.urlSegment));
  if (!taken.has(base)) return base;
  for (let i = 1; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}
