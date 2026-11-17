import { AdminLayout } from "./AdminLayout";
import { AdminSettingsPage } from "./AdminSettingsPage";

/** Dedicated admin sidebar destination for all site advertising placements. */
export function AdminAdvertisingPage() {
  return <AdminLayout><AdminSettingsPage embedded initialTab="advertising" /></AdminLayout>;
}
