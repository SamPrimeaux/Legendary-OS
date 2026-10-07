import { Registry, type FieldDef } from "./registry.ts";

const eyebrow: FieldDef = { key: "eyebrow", label: "Eyebrow", type: "text" };
const source: FieldDef = { key: "source", label: "Pull from collection", type: "collection", help: "Bind to a collection instead of typing items by hand." };

/** The single place section and collection types are defined. Add new ones here, once. */
export function createRegistry(): Registry {
  return new Registry()
    .addSection({
      type: "hero",
      label: "Hero",
      fields: [
        eyebrow,
        { key: "heading", label: "Heading", type: "text", required: true },
        { key: "body", label: "Body", type: "textarea" },
        { key: "mediaKey", label: "Background image", type: "image" },
        { key: "alt", label: "Image description", type: "text" },
        { key: "proof", label: "Proof points", type: "list" },
        { key: "primaryCta", label: "Primary button", type: "link" },
        { key: "secondaryCta", label: "Secondary button", type: "link" },
      ],
    })
    .addSection({
      type: "text-split",
      label: "Text + image",
      fields: [
        eyebrow,
        { key: "heading", label: "Heading", type: "text", required: true },
        { key: "body", label: "Body (blank line = new paragraph)", type: "textarea" },
        { key: "mediaKey", label: "Image", type: "image" },
        { key: "reverse", label: "Image on the left", type: "boolean" },
        { key: "points", label: "Bullet points", type: "list" },
        { key: "cta", label: "Button", type: "link" },
      ],
    })
    .addSection({
      type: "card-grid",
      label: "Card grid",
      description: "Services, process steps, listings, team. Items inline or bound to a collection.",
      fields: [
        eyebrow,
        { key: "heading", label: "Heading", type: "text" },
        { key: "intro", label: "Intro", type: "textarea" },
        { key: "layout", label: "Layout", type: "select", options: ["cards", "steps", "listings", "team"] },
        { key: "columns", label: "Columns", type: "select", options: ["2", "3", "4"] },
        { key: "items", label: "Items", type: "list", itemFields: [
          { key: "title", label: "Title", type: "text", required: true },
          { key: "body", label: "Body", type: "textarea" },
          { key: "mediaKey", label: "Image", type: "image" },
          { key: "href", label: "Link", type: "text" },
          { key: "alt", label: "Image description", type: "text" },
          { key: "meta", label: "Meta line", type: "text" },
          { key: "badge", label: "Badge", type: "text" },
        ] },
        source,
        { key: "cta", label: "Button", type: "link" },
      ],
    })
    .addSection({
      type: "before-after",
      label: "Before / after slider",
      description: "Landscape before/after, sketch to finished build. One pair or many; inline or from a collection.",
      fields: [
        eyebrow,
        { key: "heading", label: "Heading", type: "text" },
        { key: "pairs", label: "Pairs", type: "list", itemFields: [
          { key: "beforeKey", label: "Before image", type: "image", required: true },
          { key: "afterKey", label: "After image", type: "image", required: true },
          { key: "beforeLabel", label: "Before label", type: "text" },
          { key: "afterLabel", label: "After label", type: "text" },
          { key: "caption", label: "Caption", type: "text" },
          { key: "alt", label: "Alt text", type: "text" },
        ] },
        source,
      ],
    })
    .addSection({
      type: "testimonials",
      label: "Testimonials",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "items", label: "Quotes", type: "list", itemFields: [
          { key: "quote", label: "Quote", type: "textarea", required: true },
          { key: "by", label: "Name", type: "text", required: true },
          { key: "meta", label: "Detail", type: "text" },
        ] },
        source,
      ],
    })
    .addSection({
      type: "cta-banner",
      label: "Call to action",
      fields: [
        eyebrow,
        { key: "heading", label: "Heading", type: "text", required: true },
        { key: "body", label: "Body", type: "textarea" },
        { key: "cta", label: "Primary button", type: "link", required: true },
        { key: "secondary", label: "Secondary button", type: "link" },
      ],
    })
    .addSection({
      type: "contact-form",
      label: "Lead form",
      description: "Posts to /api/leads. Fields are configured per app; the form kind becomes the lead kind.",
      fields: [
        { key: "heading", label: "Heading", type: "text", required: true },
        { key: "intro", label: "Intro", type: "textarea" },
        { key: "form", label: "Form kind", type: "text", required: true },
        { key: "fields", label: "Fields", type: "list", itemFields: [
          { key: "name", label: "Field name", type: "text", required: true },
          { key: "label", label: "Label", type: "text", required: true },
          { key: "type", label: "Type", type: "select", options: ["text", "email", "tel", "textarea", "select", "number", "date"], required: true },
          { key: "required", label: "Required", type: "boolean" },
          { key: "options", label: "Options (select only)", type: "list" },
        ] },
        { key: "submitLabel", label: "Button label", type: "text" },
      ],
    })
    .addCollection({ name: "services", label: "Services", fields: [
      { key: "body", label: "Description", type: "textarea" },
      { key: "mediaKey", label: "Image", type: "image" },
      { key: "href", label: "Link", type: "text" },
    ] })
    .addCollection({ name: "process-steps", label: "Process steps", fields: [
      { key: "body", label: "Description", type: "textarea" },
    ] })
    .addCollection({ name: "portfolio", label: "Portfolio / projects", fields: [
      { key: "body", label: "Summary", type: "textarea" },
      { key: "category", label: "Category", type: "text" },
      { key: "mediaKey", label: "Cover image", type: "image" },
      { key: "beforeKey", label: "Before image", type: "image" },
      { key: "afterKey", label: "After image", type: "image" },
      { key: "beforeLabel", label: "Before label", type: "text" },
      { key: "afterLabel", label: "After label", type: "text" },
      { key: "meta", label: "Location / meta", type: "text" },
    ] })
    .addCollection({ name: "reviews", label: "Reviews", fields: [
      { key: "quote", label: "Quote", type: "textarea", required: true },
      { key: "meta", label: "Detail", type: "text" },
    ] })
    .addCollection({ name: "listings", label: "Available homes", fields: [
      { key: "body", label: "Description", type: "textarea" },
      { key: "mediaKey", label: "Image", type: "image" },
      { key: "meta", label: "Beds / baths / size", type: "text" },
      { key: "badge", label: "Status badge", type: "text" },
      { key: "href", label: "Link", type: "text" },
    ] })
    .addCollection({ name: "team", label: "Team", fields: [
      { key: "body", label: "Bio", type: "textarea" },
      { key: "mediaKey", label: "Photo", type: "image" },
      { key: "meta", label: "Role", type: "text" },
    ] });
}
