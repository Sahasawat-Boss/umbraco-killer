import { redirect } from "next/navigation";

export default function BackofficeRoot() {
  redirect("/umbraco/section/content");
}
