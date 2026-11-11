import { notFound } from "next/navigation";
import { getAllMedia, mediaCrumbs } from "@/lib/media-data";
import { MediaBrowser, MediaItemEditor } from "@/components/backoffice/MediaViews";

export default async function MediaItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = await getAllMedia();
  const item = all.find((m) => m.id === id);
  if (!item) notFound();
  if (item.mediaType === "Folder") {
    return (
      <MediaBrowser
        key={item.id}
        folder={item}
        items={all.filter((m) => m.parentId === item.id)}
        all={all}
        breadcrumbs={[...mediaCrumbs(all, item.parentId), { name: item.name }]}
      />
    );
  }
  return <MediaItemEditor key={item.id + item.updatedAt} item={item} all={all} breadcrumbs={mediaCrumbs(all, item.parentId)} />;
}
