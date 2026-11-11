import Link from "next/link";
import { SimpleWorkspace } from "@/components/backoffice/Workspace";
import { Box } from "@/components/ui";
import { Icon } from "@/lib/icons";

const cards = [
  {
    href: "/umbraco/section/settings/document-types",
    icon: "LayoutTemplate",
    title: "Document Types",
    text: "Define the structure of your content: groups, properties and where it can be created.",
  },
  {
    href: "/umbraco/section/settings/data-types",
    icon: "Database",
    title: "Data Types",
    text: "Configure property editors: dropdown options, pickers, text limits and more.",
  },
  { href: "/api/delivery/v2/content", icon: "Globe", title: "Delivery API", text: "Headless JSON API for your published content and media." },
];

const endpoints = [
  "GET /api/delivery/v2/content",
  "GET /api/delivery/v2/content?fetch=children:/&take=10",
  "GET /api/delivery/v2/content?fetch=descendants:{id}&filter=contentType:blogPost&sort=updateDate:desc",
  "GET /api/delivery/v2/content/item/{id}",
  "GET /api/delivery/v2/content/item/blog/hello-world",
  "GET /api/delivery/v2/media/item/{id}",
];

export default function SettingsDashboard() {
  return (
    <SimpleWorkspace title="Settings" icon="Code">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-[6px] bg-white p-6 shadow-[0_1px_1px_rgba(0,0,0,0.12)] transition hover:ring-2 hover:ring-brand-300"
            >
              <Icon name={c.icon} className="mb-3 size-8 text-brand-700" />
              <div className="font-bold">{c.title}</div>
              <p className="mt-1 text-sm text-muted">{c.text}</p>
            </Link>
          ))}
        </div>
        <Box headline="Delivery API quick reference">
          <div className="space-y-2 font-mono text-[13px]">
            {endpoints.map((l) => (
              <div key={l} className="rounded bg-surface px-3 py-2">
                {l}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            Set <code className="font-mono">DELIVERY_API_KEY</code> in <code className="font-mono">.env</code> to require an{" "}
            <code className="font-mono">Api-Key</code> header.
          </p>
        </Box>
      </div>
    </SimpleWorkspace>
  );
}
