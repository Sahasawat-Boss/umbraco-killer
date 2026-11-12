# umbraco-killer 🔥

An Umbraco-style CMS (backoffice + headless Delivery API) in a red theme, built with **Next.js 15 + Prisma + PostgreSQL**.

> This is a research/learning project. It recreates Umbraco's *concepts and workflow* (sections, content tree, Document Types, Data Types, Delivery API). It does not use any Umbraco code or assets.

<img width="1532" height="4056" alt="umbraco-killer-preview" src="https://github.com/user-attachments/assets/576eb9a6-f8bd-410f-ad2f-117c66b59cc4" />

## Requirements

- **Node.js 20+** (`node -v`)
- **Docker** (Docker Desktop on Windows/macOS) for the bundled Postgres 16 — or any Postgres 14+ you already have
- Free ports **3000** (app) and **5434** (database)

## Quick start (fresh clone)

```bash
git clone https://github.com/Sahasawat-Boss/umbraco-killer.git
cd umbraco-killer
npm install                 # dependencies + prisma generate
npm run setup               # .env, Postgres in Docker, tables
npm run dev                 # http://localhost:3000
```

`npm run setup` does the following, and is safe to run again:
1. creates `.env` from `.env.example` with a random `AUTH_SECRET` (an existing `.env` is never overwritten)
2. starts Postgres with `docker compose up -d` and waits until it accepts connections
3. creates the tables (`prisma db push`)

Open `http://localhost:3000`. The first visit takes you to **/install**: create the admin account and (optionally) the starter kit with sample Document Types, content and Block List sections (Rich Text, Image, Feature Grid, Call to Action, Quote).

- Backoffice: `http://localhost:3000/umbraco`
- Public site (default template): `http://localhost:3000/`
- Delivery API: `http://localhost:3000/api/delivery/v2/content`

> Content, users and uploaded media live in your local database and `./uploads`; they are **not** in git. Each new machine starts empty and goes through /install.

### Using your own Postgres (no Docker)

Create an empty database, then:

```bash
cp .env.example .env        # set DATABASE_URL to your database, AUTH_SECRET to a long random string
npm run setup -- --no-docker
```

### Manual steps (what setup does)

```bash
cp .env.example .env        # then change AUTH_SECRET
npm run db:up               # Postgres 16 in Docker on port 5434
npm run db:push             # create tables
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| `Docker is not running` | Start Docker Desktop and run `npm run setup` again. |
| `AUTH_SECRET must be set (16+ chars)` | `.env` is missing or the secret is too short. Run `npm run setup`, or edit `.env`. |
| `Can't reach database server at localhost:5434` | Postgres isn't running: `npm run db:up`. Check `docker compose logs db`. |
| Port 5434 or 3000 already in use | Change the left side of `"5434:5432"` in `docker-compose.yml` and the port in `DATABASE_URL`; or run the app with `npm run dev -- -p 3001`. |
| `npm install` / image pull fails on a company network | Configure your proxy for npm (`npm config set proxy …`) and Docker Desktop (Settings › Resources › Proxies). |

To start over with an empty database: `docker compose down -v && npm run setup`.

## Features

| Section | What's in it |
|---|---|
| **Content** | Content tree with context menu (Create, Publish with descendants, Unpublish, Move, Copy, Sort, Delete). Workspace with **Content / Info** views, Save, Save and publish, validation (mandatory, regex, limits), draft vs. published state ("pending changes"), version history + **rollback**, audit history, Recycle Bin (restore / delete / empty). Page **sections** via Block List (add, drag to reorder, duplicate, hide, delete). `Ctrl+S` saves. |
| **Media** | Folder tree, drag-and-drop upload, grid/list views, multi-select trash, image dimensions, alt text, move, Recycle Bin. Files are stored in `./uploads` and served at `/media/...`. |
| **Settings** | **Document Types**: groups and properties, aliases, icon picker, allowed at root, allowed child types, element types (used as blocks; can't be deleted while in use). **Data Types**: 18 property editors with per-editor configuration and a live preview. |
| **Users** | Users with groups **Administrators / Editors / Writers** (writers can't publish, move content to the Recycle Bin or delete permanently; only admins see Settings and Users), disable, reset password, change your own password. |
| Global | Search (`Ctrl+K`), toasts, sign-in/installer screens, session cookie (JWT, 8 h), login lockout after 5 failed attempts (15 min, per email and IP). |

### Property editors
Text Box, Text Area, Rich Text (toolbar, links, media insert, HTML source), Numeric, Decimal, Toggle, Date Picker (with optional time), Dropdown (single/multiple), Checkbox List, Radio Button List, Media Picker (single/multiple, images only), Content Picker, Tags, Color Picker, Email Address, Repeatable Textstrings, Label, **Block List** (reorderable sections/widgets built from Element Types, nestable).

Rich Text HTML is sanitized on save and on output (allowlist in `src/lib/sanitize.ts`), so scripts and `on*`/`javascript:` attributes never reach the site or the backoffice.

### Block List: adding a new section / widget
1. **Settings › Document Types** → create a type and turn on **Is an Element Type**; add its properties.
2. **Settings › Data Types** → open **Page Sections** (or any Block List) and tick the new Element Type under *Available blocks*.
3. Editors can now add it in the **Sections** property of Home / Content Page.
4. To give it a design on the default template, add a renderer keyed by the Element Type alias to `BLOCKS` in `src/components/site/Blocks.tsx`. Without one, the block is shown with a generic fallback.

## Delivery API (v2-style)

```
GET /api/delivery/v2/content                                   all published content
GET /api/delivery/v2/content?fetch=children:/                  children of the first root
GET /api/delivery/v2/content?fetch=descendants:{id|path}
GET /api/delivery/v2/content?fetch=ancestors:{id|path}
    &filter=contentType:blogPost   &filter=name:hello   (prefix value with ! to negate)
    &sort=createDate:desc | updateDate | name | sortOrder | level
    &skip=0&take=10
GET /api/delivery/v2/content/item/{id}
GET /api/delivery/v2/content/item/blog/hello-world
GET /api/delivery/v2/content/items?id=..&id=..
GET /api/delivery/v2/media?fetch=children:/ | children:{folderId}
GET /api/delivery/v2/media/item/{id}
```

Media pickers are expanded to media objects, content pickers to `{ id, name, contentType, route }`, rich text to `{ markup, blocks }` (HTML is sanitized), and Block Lists to `{ items: [{ content, settings }] }`.
Set `DELIVERY_API_KEY` in `.env` to require an `Api-Key` header.

## Routing

Same as Umbraco without domains: a root node is `/`, and its descendants are `/segment/child/`. A page is routable only if it and all its ancestors are published. URL segments come from the node name and keep Thai or other Unicode letters. Segments are unique among siblings (`hello-world`, `hello-world-1`, …), so two pages never share a route.

## Project layout

```
prisma/schema.prisma            data model
src/actions/*                   server actions (content, media, settings, users, auth, search)
src/lib/editors.ts              property editor registry and default data types
src/lib/content-values.ts       clean, sanitize and validate document values (incl. blocks)
src/lib/sanitize.ts             Rich Text HTML allowlist
src/lib/delivery.ts             Delivery API mapping
src/lib/routes.ts               URL routing
src/components/backoffice/*     tree, workspace, section UIs
src/components/editors/*        property editors, pickers and the Block List editor
src/components/site/Blocks.tsx  block renderers for the public site
src/app/umbraco/...             backoffice routes
src/app/api/delivery/v2/...     Delivery API
src/app/[[...slug]]             public site default template
scripts/setup.mjs               one-shot local setup (npm run setup)
```

## Theme

The design tokens live in `src/app/globals.css` (`@theme`). Change `--color-brand-*`, `--color-header` and `--color-positive` to retheme.

## Not implemented yet (compared to Umbraco)

Languages/variants and Dictionary, Members, Templates/partial views editor, Block Grid, Media Types/Member Types, scheduled publishing, redirect URL management, granular per-node permissions, Log viewer, and package/extension system.
