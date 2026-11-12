import sanitizeHtml from "sanitize-html";

/**
 * Allowlist for Rich Text values — what the RTE toolbar can produce, plus a few
 * harmless formatting tags that browsers' contentEditable / paste emit.
 * Everything else (script, iframe, style, on* handlers, javascript: URLs…) is stripped.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "div", "br", "hr", "span",
    "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "sub", "sup", "code", "pre",
    "ul", "ol", "li", "blockquote",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "data-media-id"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    // links opening a new tab must not get access to window.opener
    a: (tagName, attribs) =>
      attribs.target === "_blank" ? { tagName, attribs: { ...attribs, rel: "noopener noreferrer" } } : { tagName, attribs },
  },
};

export function sanitizeRichText(html: unknown): string {
  if (typeof html !== "string" || !html) return "";
  return sanitizeHtml(html, OPTIONS);
}
