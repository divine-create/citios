import { redirect } from 'next/navigation';

// This route duplicated app/(admin)/school/admin — consolidated into one
// real, DB-backed Admin Portal there. Kept as a redirect so old links/bookmarks
// still land somewhere.
export default function SchoolAdminPage() {
  redirect('/school/admin');
}
