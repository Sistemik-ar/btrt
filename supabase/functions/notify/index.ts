// ════════════════════════════════════════════════════════════════════════════
//  Edge Function: notify — broadcast web-push a los miembros suscriptos
// ════════════════════════════════════════════════════════════════════════════
//
//  POST /functions/v1/notify   (Authorization: Bearer <JWT del admin>)
//  body: { title, body, url?, tag? }
//
//  Flujo:
//    1. Verifica que el JWT sea de un admin (ADMIN_EMAILS).
//    2. Lee push_subscriptions con la service-role key (bypass RLS).
//    3. Manda web-push firmado con la VAPID private key.
//    4. Borra las suscripciones muertas (404/410).
//
//  Secrets (supabase secrets set ...):
//    VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, ADMIN_EMAILS
//  Inyectados por Supabase: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// ════════════════════════════════════════════════════════════════════════════

import webpush from "npm:web-push@3.6.7"
import { createClient } from "npm:@supabase/supabase-js@2"

const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:bandurriastrailrunning@gmail.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405)

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")
  if (!token) return json({ error: "missing token" }, 401)

  // 1) Verify caller is an admin.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "invalid token" }, 401)
  if (!ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
    return json({ error: "forbidden" }, 403)
  }

  const { title, body, url, tag } = await req.json().catch(() => ({}))
  if (!title) return json({ error: "title required" }, 400)

  // 2) Read every subscription with service role.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: subs, error: subErr } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
  if (subErr) return json({ error: subErr.message }, 500)

  // 3) Fan out.
  const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/", tag })
  const stale: string[] = []
  let sent = 0, failed = 0

  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      )
      sent++
    } catch (e) {
      failed++
      const code = (e as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) stale.push(s.endpoint)
    }
  }))

  // 4) Prune dead endpoints.
  if (stale.length) await admin.from("push_subscriptions").delete().in("endpoint", stale)

  return json({ sent, failed, removed: stale.length })
})
