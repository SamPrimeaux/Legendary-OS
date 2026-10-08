export type FieldType = "text" | "textarea" | "richtext" | "number" | "boolean" | "select" | "image" | "link" | "collection" | "list";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  itemFields?: FieldDef[];
  help?: string;
}
export interface ComponentDef { type: string; label: string; description?: string; fields: FieldDef[]; presets?: string[] }
export interface CollectionDef { name: string; label: string; fields: FieldDef[] }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const missing = (v: unknown) => v === undefined || v === null || v === "";

/** Editor forms are generated from these definitions, so a new section never needs new editor code. */
export class Registry {
  readonly sections = new Map<string, ComponentDef>();
  readonly collections = new Map<string, CollectionDef>();

  addSection(def: ComponentDef): this {
    if (this.sections.has(def.type)) throw new Error(`Duplicate section type: ${def.type}`);
    this.sections.set(def.type, def);
    return this;
  }
  addCollection(def: CollectionDef): this {
    if (this.collections.has(def.name)) throw new Error(`Duplicate collection: ${def.name}`);
    this.collections.set(def.name, def);
    return this;
  }
  manifest() {
    return { sections: [...this.sections.values()], collections: [...this.collections.values()] };
  }

  validateFields(fields: FieldDef[], data: Record<string, unknown>, path: string): string[] {
    const errors: string[] = [];
    for (const f of fields) {
      const v = data[f.key];
      const at = `${path}.${f.key}`;
      if (missing(v)) {
        if (f.required) errors.push(`${at} is required`);
        continue;
      }
      switch (f.type) {
        case "text": case "textarea": case "richtext": case "image":
          if (typeof v !== "string") errors.push(`${at} must be a string`);
          break;
        case "number":
          if (typeof v !== "number") errors.push(`${at} must be a number`);
          break;
        case "boolean":
          if (typeof v !== "boolean") errors.push(`${at} must be a boolean`);
          break;
        case "select":
          if (typeof v !== "string" || (f.options && !f.options.includes(v))) errors.push(`${at} must be one of: ${(f.options ?? []).join(", ")}`);
          break;
        case "link":
          if (!isObj(v) || typeof v.label !== "string" || (typeof v.href !== "string" && typeof v.overlay !== "string")) errors.push(`${at} must be { label, href | overlay }`);
          break;
        case "collection":
          if (!isObj(v) || typeof v.collection !== "string") errors.push(`${at} must be { collection, limit? }`);
          break;
        case "list":
          if (!Array.isArray(v)) errors.push(`${at} must be a list`);
          else if (f.itemFields) v.forEach((item, i) => {
            if (!isObj(item)) errors.push(`${at}[${i}] must be an object`);
            else errors.push(...this.validateFields(f.itemFields as FieldDef[], item, `${at}[${i}]`));
          });
          break;
      }
    }
    return errors;
  }
}
