// Browser-side bootstrap for Supabase credentials configured in Vercel.
// Add SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)
// to Vercel Project Settings -> Environment Variables.
// The publishable/anon key is intended for browser use; NEVER use a service_role key.
window.RR_SUPABASE_READY = (async () => {
  if (window.SUPABASE_URL && window.SUPABASE_KEY) return;

  const response = await fetch(new URL("api/supabase-config", document.baseURI), {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Supabase public configuration is not available (" + response.status + ").");
  }

  const config = await response.json();
  if (typeof config.url !== "string" || typeof config.key !== "string") {
    throw new Error("Invalid Supabase public configuration.");
  }

  window.SUPABASE_URL = config.url;
  window.SUPABASE_KEY = config.key;
})().catch((error) => {
  window.RR_SUPABASE_ERROR = error.message;
  console.warn("[Red Ribbon] Supabase login unavailable:", error.message);
});
