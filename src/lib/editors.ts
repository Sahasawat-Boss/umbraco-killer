/**
 * Property editor registry — shared by server and client.
 * A Data Type = one of these editors + a config object.
 */

export type ConfigFieldType = "number" | "text" | "boolean" | "items" | "colors" | "elementTypes";

export interface ConfigField {
  key: string;
  label: string;
  description?: string;
  type: ConfigFieldType;
}

export interface EditorDefinition {
  alias: string;
  name: string;
  icon: string;
  description: string;
  configFields: ConfigField[];
  defaultConfig: Record<string, unknown>;
}

export const EDITORS: EditorDefinition[] = [
  {
    alias: "Killer.TextBox",
    name: "Text Box",
    icon: "Type",
    description: "Single line of text",
    configFields: [{ key: "maxChars", label: "Maximum allowed characters", type: "number" }],
    defaultConfig: { maxChars: 512 },
  },
  {
    alias: "Killer.TextArea",
    name: "Text Area",
    icon: "AlignLeft",
    description: "Multiple lines of plain text",
    configFields: [
      { key: "rows", label: "Number of rows", type: "number" },
      { key: "maxChars", label: "Maximum allowed characters", type: "number" },
    ],
    defaultConfig: { rows: 4, maxChars: 0 },
  },
  {
    alias: "Killer.RichText",
    name: "Rich Text Editor",
    icon: "Pilcrow",
    description: "WYSIWYG HTML editor",
    configFields: [{ key: "height", label: "Editor height (px)", type: "number" }],
    defaultConfig: { height: 260 },
  },
  {
    alias: "Killer.Integer",
    name: "Numeric",
    icon: "Hash",
    description: "Whole numbers",
    configFields: [
      { key: "min", label: "Minimum", type: "number" },
      { key: "max", label: "Maximum", type: "number" },
      { key: "step", label: "Step size", type: "number" },
    ],
    defaultConfig: { step: 1 },
  },
  {
    alias: "Killer.Decimal",
    name: "Decimal",
    icon: "Percent",
    description: "Decimal numbers",
    configFields: [
      { key: "min", label: "Minimum", type: "number" },
      { key: "max", label: "Maximum", type: "number" },
      { key: "step", label: "Step size", type: "number" },
    ],
    defaultConfig: { step: 0.01 },
  },
  {
    alias: "Killer.Toggle",
    name: "Toggle",
    icon: "ToggleRight",
    description: "True / false switch",
    configFields: [
      { key: "default", label: "Preset value", type: "boolean" },
      { key: "labelOn", label: "Label", type: "text" },
    ],
    defaultConfig: { default: false, labelOn: "" },
  },
  {
    alias: "Killer.DateTime",
    name: "Date Picker",
    icon: "Calendar",
    description: "Date, optionally with time",
    configFields: [{ key: "includeTime", label: "Include time", type: "boolean" }],
    defaultConfig: { includeTime: false },
  },
  {
    alias: "Killer.Dropdown",
    name: "Dropdown",
    icon: "ChevronDown",
    description: "Pick from a list",
    configFields: [
      { key: "multiple", label: "Enable multiple choice", type: "boolean" },
      { key: "items", label: "Add options", type: "items" },
    ],
    defaultConfig: { multiple: false, items: [] },
  },
  {
    alias: "Killer.CheckBoxList",
    name: "Checkbox List",
    icon: "ListChecks",
    description: "Multiple choice checkboxes",
    configFields: [{ key: "items", label: "Add options", type: "items" }],
    defaultConfig: { items: [] },
  },
  {
    alias: "Killer.RadioButtonList",
    name: "Radio Button List",
    icon: "CircleDot",
    description: "Single choice radio buttons",
    configFields: [{ key: "items", label: "Add options", type: "items" }],
    defaultConfig: { items: [] },
  },
  {
    alias: "Killer.MediaPicker",
    name: "Media Picker",
    icon: "Image",
    description: "Pick items from the Media library",
    configFields: [
      { key: "multiple", label: "Pick multiple items", type: "boolean" },
      { key: "onlyImages", label: "Pick only images", type: "boolean" },
    ],
    defaultConfig: { multiple: false, onlyImages: true },
  },
  {
    alias: "Killer.ContentPicker",
    name: "Content Picker",
    icon: "FileSymlink",
    description: "Link to other content nodes",
    configFields: [{ key: "multiple", label: "Pick multiple items", type: "boolean" }],
    defaultConfig: { multiple: false },
  },
  {
    alias: "Killer.Tags",
    name: "Tags",
    icon: "Tags",
    description: "Free-form tags",
    configFields: [],
    defaultConfig: {},
  },
  {
    alias: "Killer.ColorPicker",
    name: "Color Picker",
    icon: "Palette",
    description: "Pick from approved colors",
    configFields: [{ key: "colors", label: "Colors", type: "colors" }],
    defaultConfig: { colors: ["#c62828", "#1e293b", "#f59e0b", "#16a34a", "#2563eb"] },
  },
  {
    alias: "Killer.EmailAddress",
    name: "Email Address",
    icon: "AtSign",
    description: "Validated email address",
    configFields: [],
    defaultConfig: {},
  },
  {
    alias: "Killer.MultipleTextString",
    name: "Repeatable Textstrings",
    icon: "Rows3",
    description: "A list of text strings",
    configFields: [
      { key: "min", label: "Minimum", type: "number" },
      { key: "max", label: "Maximum", type: "number" },
    ],
    defaultConfig: { min: 0, max: 0 },
  },
  {
    alias: "Killer.BlockList",
    name: "Block List",
    icon: "Blocks",
    description: "Reorderable sections / widgets built from Element Types",
    configFields: [
      {
        key: "blocks",
        label: "Available blocks",
        description: "Element Types editors can add. Leave all unchecked to allow every Element Type.",
        type: "elementTypes",
      },
      { key: "min", label: "Minimum number of blocks", type: "number" },
      { key: "max", label: "Maximum number of blocks", type: "number" },
    ],
    defaultConfig: { blocks: [], min: 0, max: 0 },
  },
  {
    alias: "Killer.Label",
    name: "Label",
    icon: "Tag",
    description: "Read-only value",
    configFields: [],
    defaultConfig: {},
  },
];

export const EDITOR_MAP = new Map(EDITORS.map((e) => [e.alias, e]));

export function getEditor(alias: string) {
  return EDITOR_MAP.get(alias) ?? EDITORS[0];
}

/** One block inside a Block List value. `values` is keyed by the Element Type's property aliases. */
export type BlockItem = { key: string; contentTypeId: string; values: Record<string, unknown>; hidden?: boolean };

export function asBlocks(v: unknown): BlockItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((b): b is BlockItem => !!b && typeof b === "object" && typeof b.key === "string" && typeof b.contentTypeId === "string")
    .map((b) => ({ ...b, values: b.values && typeof b.values === "object" && !Array.isArray(b.values) ? b.values : {} }));
}

export function newBlockKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function isEmptyValue(v: unknown) {
  if (v === undefined || v === null || v === "" || v === false) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "string") return v.replace(/<[^>]*>/g, "").trim() === "" && !/<img/i.test(v);
  return false;
}

/** Default data types created by the installer (mirrors a fresh Umbraco install). */
export const DEFAULT_DATA_TYPES: { name: string; editorAlias: string; config?: Record<string, unknown> }[] = [
  { name: "Textstring", editorAlias: "Killer.TextBox" },
  { name: "Textarea", editorAlias: "Killer.TextArea" },
  { name: "Richtext editor", editorAlias: "Killer.RichText" },
  { name: "Numeric", editorAlias: "Killer.Integer" },
  { name: "Decimal", editorAlias: "Killer.Decimal" },
  { name: "True/false", editorAlias: "Killer.Toggle" },
  { name: "Date Picker", editorAlias: "Killer.DateTime" },
  { name: "Date Picker with time", editorAlias: "Killer.DateTime", config: { includeTime: true } },
  { name: "Dropdown", editorAlias: "Killer.Dropdown" },
  { name: "Checkbox list", editorAlias: "Killer.CheckBoxList" },
  { name: "Radiobox", editorAlias: "Killer.RadioButtonList" },
  { name: "Image Media Picker", editorAlias: "Killer.MediaPicker" },
  { name: "Multiple Media Picker", editorAlias: "Killer.MediaPicker", config: { multiple: true, onlyImages: false } },
  { name: "Content Picker", editorAlias: "Killer.ContentPicker" },
  { name: "Tags", editorAlias: "Killer.Tags" },
  { name: "Approved Color", editorAlias: "Killer.ColorPicker" },
  { name: "Email Address", editorAlias: "Killer.EmailAddress" },
  { name: "Repeatable Textstrings", editorAlias: "Killer.MultipleTextString" },
  { name: "Label", editorAlias: "Killer.Label" },
  { name: "Block List", editorAlias: "Killer.BlockList" },
];
