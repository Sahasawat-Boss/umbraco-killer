import bcrypt from "bcryptjs";
import { db } from "./db";
import { DEFAULT_DATA_TYPES, getEditor } from "./editors";

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

  type P = { alias: string; name: string; dt: string; mandatory?: boolean; description?: string };
  const makeType = async (
    alias: string,
    name: string,
    icon: string,
    allowedAtRoot: boolean,
    groups: { name: string; props: P[] }[],
    description = "",
  ) =>
    db.documentType.create({
      data: {
        alias,
        name,
        icon,
        allowedAtRoot,
        description,
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
        props: [{ alias: "bodyText", name: "Body text", dt: dts["Richtext editor"]! }],
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
}
