import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/backoffice/Tree";
import { MediaTree } from "@/components/backoffice/MediaViews";
import { getAllMedia } from "@/lib/media-data";

export default async function MediaLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const [items, trashedCount] = await Promise.all([getAllMedia(), db.media.count({ where: { trashed: true } })]);
  return (
    <>
      <Sidebar>
        <MediaTree items={items} trashedCount={trashedCount} />
      </Sidebar>
      {children}
    </>
  );
}
