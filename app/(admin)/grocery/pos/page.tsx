import RetailPOS from "@/components/grocery/RetailPOS";
import { requireOrgAccess } from '@/lib/rbac';

export const metadata = {
  title: "In-Store POS | CityConnect Grocery",
  description: "Point of Sale for walk-in customers.",
};

export default async function POSPage() {
  await requireOrgAccess('RETAIL');
  return <RetailPOS />;
}
