import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProtectedIssuerLayout({ children }) {
  const user = await currentUser();

  if (!user) return null; // Should be caught by root issuer-portal layout

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  const { data } = await supabaseAdmin
    .from("issuers")
    .select(
      "legal_entity_name, country, city, business_email, business_phone_number, business_type, license_authority, trade_license_number, bank_details",
    )
    .eq("user_id", user.id)
    .single();

  // Check if all fields are filled
  const requiredFields = [
    "legal_entity_name",
    "country",
    "city",
    "business_email",
    "business_phone_number",
    "business_type",
    "license_authority",
    "trade_lisence_number",
    "bank_details",
  ];

  const isFullyOnboarded = data
    ? requiredFields.every(
        (field) => data[field] !== null && data[field] !== "",
      )
    : false;

  if (!isFullyOnboarded) {
    redirect("/issuer-portal/onboarding");
  }

  return <>{children}</>;
}
