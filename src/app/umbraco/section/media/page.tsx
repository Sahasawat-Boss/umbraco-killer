import { getAllMedia } from "@/lib/media-data";
import { MediaBrowser } from "@/components/backoffice/MediaViews";

export default async function MediaRoot() {
  const all = await getAllMedia();
  return <MediaBrowser folder={null} items={all.filter((m) => m.parentId === null)} all={all} breadcrumbs={[{ name: "Media" }]} />;
}
