import React from 'react';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import RestaurantRegisterForm from "./RestaurantRegisterForm";

export const metadata = {
  title: "RestaurantOS Registration | CityConnect",
};

export default async function RestaurantOSRegisterPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/business/restaurantos/register");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 text-orange-600 rounded-full mb-4 text-3xl">
            🍽️
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Set up your kitchen</h1>
          <p className="text-slate-500 mt-2">
            For restaurants, eateries and fast food. Tell us about your business to provision your RestaurantOS dashboard.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 md:p-10">
          <RestaurantRegisterForm />
        </div>
      </div>
    </div>
  );
}
