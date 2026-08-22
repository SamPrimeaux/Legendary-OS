export type CmsFieldType = 'text' | 'textarea' | 'richtext' | 'number' | 'boolean' | 'select' | 'image' | 'images' | 'link' | 'color' | 'json';

export type CmsFieldDefinition = {
  key: string;
  label: string;
  type: CmsFieldType;
  required?: boolean;
  help?: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: unknown;
};

export type CmsComponentDefinition = {
  type: string;
  label: string;
  description?: string;
  fields: CmsFieldDefinition[];
};

export class CmsRegistry {
  readonly sections = new Map<string, CmsComponentDefinition>();
  readonly blocks = new Map<string, CmsComponentDefinition>();

  registerSection(definition: CmsComponentDefinition) {
    this.assertDefinition(definition);
    this.sections.set(definition.type, Object.freeze({ ...definition, fields: [...definition.fields] }));
    return this;
  }

  registerBlock(definition: CmsComponentDefinition) {
    this.assertDefinition(definition);
    this.blocks.set(definition.type, Object.freeze({ ...definition, fields: [...definition.fields] }));
    return this;
  }

  getSection(type: string) { return this.sections.get(type) ?? null; }
  getBlock(type: string) { return this.blocks.get(type) ?? null; }

  manifest() {
    return {
      sections: [...this.sections.values()],
      blocks: [...this.blocks.values()],
    };
  }

  validate(kind: 'section' | 'block', type: string, data: Record<string, unknown>) {
    const definition = kind === 'section' ? this.getSection(type) : this.getBlock(type);
    if (!definition) return { ok: false as const, errors: [`Unknown ${kind} type: ${type}`] };
    const errors = definition.fields
      .filter((field) => field.required && (data[field.key] === undefined || data[field.key] === null || data[field.key] === ''))
      .map((field) => `${field.label} is required`);
    return errors.length ? { ok: false as const, errors } : { ok: true as const, errors: [] };
  }

  private assertDefinition(definition: CmsComponentDefinition) {
    if (!definition.type.trim()) throw new Error('CMS component type is required');
    if (!definition.label.trim()) throw new Error(`CMS component label is required: ${definition.type}`);
    const keys = new Set<string>();
    for (const field of definition.fields) {
      if (keys.has(field.key)) throw new Error(`Duplicate field ${field.key} on ${definition.type}`);
      keys.add(field.key);
    }
  }
}

export function createLegendaryCmsRegistry() {
  return new CmsRegistry()
    .registerSection({
      type: 'hero', label: 'Hero', description: 'Primary page introduction', fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
        { key: 'heading', label: 'Heading', type: 'text', required: true },
        { key: 'body', label: 'Body', type: 'textarea' },
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'ctaLabel', label: 'CTA label', type: 'text' },
        { key: 'ctaHref', label: 'CTA link', type: 'link' },
      ],
    })
    .registerSection({
      type: 'content', label: 'Content', fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'body', label: 'Body', type: 'richtext', required: true },
      ],
    })
    .registerSection({
      type: 'gallery', label: 'Gallery', fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'images', label: 'Images', type: 'images', required: true },
      ],
    })
    .registerBlock({
      type: 'text', label: 'Text', fields: [{ key: 'text', label: 'Text', type: 'richtext', required: true }],
    })
    .registerBlock({
      type: 'image', label: 'Image', fields: [
        { key: 'assetId', label: 'Image', type: 'image', required: true },
        { key: 'caption', label: 'Caption', type: 'text' },
      ],
    })
    .registerBlock({
      type: 'cta', label: 'Call to action', fields: [
        { key: 'label', label: 'Label', type: 'text', required: true },
        { key: 'href', label: 'Link', type: 'link', required: true },
      ],
    });
}
