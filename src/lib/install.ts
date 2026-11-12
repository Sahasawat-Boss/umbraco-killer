import bcrypt from "bcryptjs";
import { db } from "./db";
import { DEFAULT_DATA_TYPES, getEditor, newBlockKey } from "./editors";

export async function isInstalled() {
  return (await db.user.count()) > 0;
}

export async function runInstall(opts: { name: string; email: string; password: string; starterKit: boolean }) {
  const passwordHash = await bcrypt.hash(opts.password, 10);
  const admin = await db.user.create({
    data: { name: opts.name, email: opts.email.toLowerCase(), passwordHash, role: "admin" },
  });

  for (const dt of DEFAULT_DATA_TYPES) {
    await db.dataType.upsert({
      where: { name: dt.name },
      update: {},
      create: {
        name: dt.name,
        editorAlias: dt.editorAlias,
        config: { ...getEditor(dt.editorAlias).defaultConfig, ...(dt.config ?? {}) } as object,
      },
    });
  }

  if (opts.starterKit) await installStarterKit(admin.id);
  return admin;
}

type P = { alias: string; name: string; dt: string; mandatory?: boolean; description?: string };

function makeType(
  alias: string,
  name: string,
  icon: string,
  allowedAtRoot: boolean,
  groups: { name: string; props: P[] }[],
  description = "",
  isElement = false,
) {
  return db.documentType.create({
    data: {
      alias,
      name,
      icon,
      allowedAtRoot,
      description,
      isElement,
      groups: {
        create: groups.map((g, gi) => ({
          name: g.name,
          sortOrder: gi,
          properties: {
            create: g.props.map((p, pi) => ({
              alias: p.alias,
              name: p.name,
              description: p.description ?? "",
              dataTypeId: p.dt,
              mandatory: p.mandatory ?? false,
              sortOrder: pi,
            })),
          },
        })),
      },
    },
  });
}

/**
 * Sample Element Types + a "Page Sections" Block List data type.
 * Idempotent — reuses Element Types / Data Types that already exist (matched by alias / name).
 */
export async function installBlockKit() {
  const dts = Object.fromEntries((await db.dataType.findMany()).map((d) => [d.name, d.id]));
  const ensureDataType = async (name: string, editorAlias: string, config: Record<string, unknown> = {}) =>
    dts[name] ??
    (dts[name] = (
      await db.dataType.create({
        data: { name, editorAlias, config: { ...getEditor(editorAlias).defaultConfig, ...config } as object },
      })
    ).id);
  const ensureElement = async (alias: string, name: string, icon: string, props: P[], description: string) =>
    (await db.documentType.findUnique({ where: { alias } })) ??
    (await makeType(alias, name, icon, false, [{ name: "Content", props }], description, true));

  const text = await ensureDataType("Textstring", "Killer.TextBox");
  const textarea = await ensureDataType("Textarea", "Killer.TextArea");
  const rte = await ensureDataType("Richtext editor", "Killer.RichText");
  const image = await ensureDataType("Image Media Picker", "Killer.MediaPicker");
  const contentPicker = await ensureDataType("Content Picker", "Killer.ContentPicker");

  const featureItem = await ensureElement(
    "featureItem",
    "Feature Item",
    "Star",
    [
      { alias: "title", name: "Title", dt: text, mandatory: true },
      { alias: "text", name: "Text", dt: textarea },
    ],
    "A single card inside a Feature Grid",
  );
  const featureItems = await ensureDataType("Feature Items", "Killer.BlockList", { blocks: [featureItem.id], min: 1, max: 6 });

  const richTextBlock = await ensureElement("richTextBlock", "Rich Text", "Pilcrow", [{ alias: "text", name: "Text", dt: rte, mandatory: true }], "Formatted text");
  const imageBlock = await ensureElement(
    "imageBlock",
    "Image",
    "Image",
    [
      { alias: "image", name: "Image", dt: image, mandatory: true },
      { alias: "caption", name: "Caption", dt: text },
    ],
    "A large image with caption",
  );
  const featureGrid = await ensureElement(
    "featureGrid",
    "Feature Grid",
    "LayoutTemplate",
    [
      { alias: "heading", name: "Heading", dt: text },
      { alias: "intro", name: "Intro", dt: textarea },
      { alias: "features", name: "Features", dt: featureItems, description: "Nested blocks — 1 to 6 feature cards" },
    ],
    "Heading plus a grid of feature cards",
  );
  const callToAction = await ensureElement(
    "callToAction",
    "Call to Action",
    "Megaphone",
    [
      { alias: "heading", name: "Heading", dt: text, mandatory: true },
      { alias: "text", name: "Text", dt: textarea },
      { alias: "buttonText", name: "Button text", dt: text },
      { alias: "buttonLink", name: "Button link", dt: contentPicker },
    ],
    "Colored banner with a button",
  );
  const quoteBlock = await ensureElement(
    "quoteBlock",
    "Quote",
    "Quote",
    [
      { alias: "quote", name: "Quote", dt: textarea, mandatory: true },
      { alias: "author", name: "Author", dt: text },
    ],
    "A highlighted quote",
  );

  const sections = await ensureDataType("Page Sections", "Killer.BlockList", {
    blocks: [richTextBlock.id, imageBlock.id, featureGrid.id, callToAction.id, quoteBlock.id],
  });
  return { sections, featureGrid, featureItem, callToAction, quoteBlock, richTextBlock, imageBlock };
}

async function installStarterKit(userId: string) {
  const dts = Object.fromEntries((await db.dataType.findMany()).map((d) => [d.name, d.id]));

  // Update the dropdown with categories for the blog
  const category = await db.dataType.create({
    data: {
      name: "Blog Category",
      editorAlias: "Killer.Dropdown",
      config: { multiple: false, items: ["News", "Tutorial", "Release", "Opinion"] },
    },
  });

  const blockKit = await installBlockKit();

  const seo: { name: string; props: P[] } = {
    name: "SEO",
    props: [
      { alias: "metaTitle", name: "Meta title", dt: dts["Textstring"]! },
      { alias: "metaDescription", name: "Meta description", dt: dts["Textarea"]! },
      { alias: "hideFromNavigation", name: "Hide from navigation", dt: dts["True/false"]! },
    ],
  };

  const blogPost = await makeType("blogPost", "Blog Post", "Newspaper", false, [
    {
      name: "Content",
      props: [
        { alias: "title", name: "Title", dt: dts["Textstring"]!, mandatory: true },
        { alias: "publishDate", name: "Publish date", dt: dts["Date Picker"]! },
        { alias: "category", name: "Category", dt: category.id },
        { alias: "excerpt", name: "Excerpt", dt: dts["Textarea"]!, description: "Short summary shown in lists" },
        { alias: "bodyText", name: "Body text", dt: dts["Richtext editor"]! },
        { alias: "tags", name: "Tags", dt: dts["Tags"]! },
        { alias: "image", name: "Image", dt: dts["Image Media Picker"]! },
      ],
    },
    seo,
  ]);

  const blog = await makeType("blog", "Blog", "BookOpen", false, [
    {
      name: "Content",
      props: [
        { alias: "title", name: "Title", dt: dts["Textstring"]! },
        { alias: "intro", name: "Intro", dt: dts["Textarea"]! },
        { alias: "pageSize", name: "Posts per page", dt: dts["Numeric"]! },
      ],
    },
    seo,
  ]);
  await db.documentType.update({ where: { id: blog.id }, data: { allowedChildIds: [blogPost.id] } });

  const contentPage = await makeType("contentPage", "Content Page", "FileText", false, [
    {
      name: "Content",
      props: [
        { alias: "title", name: "Title", dt: dts["Textstring"]!, mandatory: true },
        { alias: "bodyText", name: "Body text", dt: dts["Richtext editor"]! },
        { alias: "image", name: "Image", dt: dts["Image Media Picker"]! },
        { alias: "sections", name: "Sections", dt: blockKit.sections, description: "Add, reorder and edit page sections" },
      ],
    },
    seo,
  ]);
  await db.documentType.update({ where: { id: contentPage.id }, data: { allowedChildIds: [contentPage.id] } });

  const home = await makeType(
    "home",
    "Home",
    "House",
    true,
    [
      {
        name: "Hero",
        props: [
          { alias: "heroTitle", name: "Hero title", dt: dts["Textstring"]!, mandatory: true },
          { alias: "heroText", name: "Hero text", dt: dts["Textarea"]! },
          { alias: "heroImage", name: "Hero image", dt: dts["Image Media Picker"]! },
          { alias: "accentColor", name: "Accent color", dt: dts["Approved Color"]! },
        ],
      },
      {
        name: "Content",
        props: [
          { alias: "bodyText", name: "Body text", dt: dts["Richtext editor"]! },
          { alias: "sections", name: "Sections", dt: blockKit.sections, description: "Add, reorder and edit page sections" },
        ],
      },
      {
        name: "Footer",
        props: [
          { alias: "footerText", name: "Footer text", dt: dts["Textstring"]! },
          { alias: "contactEmail", name: "Contact email", dt: dts["Email Address"]! },
        ],
      },
    ],
    "The root of a website",
  );
  await db.documentType.update({
    where: { id: home.id },
    data: { allowedChildIds: [contentPage.id, blog.id] },
  });

  // Content
  const now = new Date();
  const mk = async (
    name: string,
    documentTypeId: string,
    parentId: string | null,
    sortOrder: number,
    values: Record<string, unknown>,
    segment: string,
  ) =>
    db.document.create({
      data: {
        name,
        documentTypeId,
        parentId,
        sortOrder,
        urlSegment: segment,
        values: values as object,
        published: true,
        edited: false,
        publishedName: name,
        publishedValues: values as object,
        publishedAt: now,
        createdById: userId,
        updatedById: userId,
      },
    });

  const homeDoc = await mk(
    "Home",
    home.id,
    null,
    0,
    {
      heroTitle: "Welcome to umb-killer",
      heroText: "A red-hot, Umbraco-style CMS built with Next.js and Postgres.",
      accentColor: "#c62828",
      bodyText:
        "<h2>Friendly, structured content</h2><p>Define <strong>Document Types</strong>, build your content tree and deliver it anywhere through the <em>Delivery API</em>.</p>",
      footerText: "Powered by umb-killer",
      contactEmail: "hello@example.com",
    },
    "home",
  );
  await mk(
    "About us",
    contentPage.id,
    homeDoc.id,
    0,
    { title: "About us", bodyText: "<p>We build things. Fast.</p>" },
    "about-us",
  );
  const blogDoc = await mk(
    "Blog",
    blog.id,
    homeDoc.id,
    1,
    { title: "Blog", intro: "News and stories from the team.", pageSize: 10 },
    "blog",
  );
  await mk(
    "Hello world",
    blogPost.id,
    blogDoc.id,
    0,
    {
      title: "Hello world",
      publishDate: now.toISOString().slice(0, 10),
      category: "News",
      excerpt: "Our very first post on umb-killer.",
      bodyText: "<p>This post was created by the starter kit. Edit it in the backoffice!</p>",
      tags: ["welcome", "cms"],
    },
    "hello-world",
  );

  // Page sections on Home (Block List) — created last so the CTA can link to the blog
  const block = (contentTypeId: string, values: Record<string, unknown>) => ({ key: newBlockKey(), contentTypeId, values });
  const sections = [
    block(blockKit.featureGrid.id, {
      heading: "Why umb-killer?",
      intro: "Everything below is a block. Reorder, hide or add sections from the backoffice.",
      features: [
        block(blockKit.featureItem.id, { title: "Document Types", text: "Model your content with groups and typed properties." }),
        block(blockKit.featureItem.id, { title: "Block List", text: "Build pages from reusable sections and widgets." }),
        block(blockKit.featureItem.id, { title: "Delivery API", text: "Fetch published content as JSON from any frontend." }),
      ],
    }),
    block(blockKit.quoteBlock.id, { quote: "Content editors should move sections, not developers.", author: "Every editor, ever" }),
    block(blockKit.callToAction.id, {
      heading: "Read the latest news",
      text: "See what the team has been shipping.",
      buttonText: "Go to the blog",
      buttonLink: blogDoc.id,
    }),
  ];
  const homeValues = { ...(homeDoc.values as Record<string, unknown>), sections };
  await db.document.update({
    where: { id: homeDoc.id },
    data: { values: homeValues as object, publishedValues: homeValues as object },
  });
}
