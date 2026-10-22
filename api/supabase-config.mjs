// Public browser configuration for a static Red Ribbon Scans site on Vercel.
// Do not expose service_role, secret API keys or database passwords here.
// Supabase publishable keys and legacy anon keys are intentionally public.
const headers = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function publicKeyAllowed(key) {
  if (key.startsWith("sb_publishable_") && key.length > 25) return true;
  if (!key.startsWith("eyJ")) return false;

  // Legacy Supabase anon key: JWT payload must explicitly have role=anon.
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    return payload.role === "anon";
  } catch {
    return false;
  }
}

export function GET() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";

  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "";

  let validUrl = false;
  try {
    const address = new URL(url);
    validUrl = address.protocol === "https:" && Boolean(address.hostname) &&
      !address.username && !address.password;
  } catch {}

  if (!validUrl || !publicKeyAllowed(key)) {
    return new Response(
      JSON.stringify({ configured: false, error: "Missing or invalid public Supabase environment variables" }),
      { status: 503, headers },
    );
  }

  return new Response(JSON.stringify({ url, key }), { status: 200, headers });
}
