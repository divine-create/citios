'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/src/prisma/db";

export async function completeSchoolSetup(data: {
  organizationId: string;
  schoolType: string;
  currentYear: number;
  currentTerm: number;
  currencyCode: string;
  currencySymbol: string;
  setupComplete: boolean;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.personId) {
    return { error: "Not authorized" };
  }

  try {
    await db.orm.public.SchoolSettings.where({ organizationId: data.organizationId }).update({
      schoolType: data.schoolType,
      currentYear: data.currentYear,
      currentTerm: data.currentTerm,
      currencyCode: data.currencyCode,
      currencySymbol: data.currencySymbol,
      setupComplete: data.setupComplete,
    });

    return { success: true };
  } catch (err: any) {
    console.error("Error completing setup:", err);
    return { error: err.message || "Failed to save settings." };
  }
}
