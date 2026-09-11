// Cloudflare Worker entry point.
// Serves the static site for all normal requests, and handles two API
// routes (/grade and /consume-credit) for AI grading + access control.
// Secret keys (env.*) stay here on the server and are never sent to the browser.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/grade" && request.method === "POST") {
      return handleGrade(request, env);
    }
    if (url.pathname === "/consume-credit" && request.method === "POST") {
      return handleConsumeCredit(request, env);
    }

    // Everything else: serve the static site (html/css/js/images).
    return env.ASSETS.fetch(request);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}

// Looks up the signed-in user and consumes one free use if they aren't Pro.
// Returns { ok: true, user } on success, or a Response to return immediately on failure.
async function checkAccess(request, env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseSecretKey = env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return { fail: json({ error: { message: "Server is missing SUPABASE_URL or SUPABASE_SECRET_KEY." } }, 500) };
  }

  const body = await request.json();
  const accessToken = body.accessToken;

  if (!accessToken) {
    return { fail: json({ error: { message: "SIGN_IN_REQUIRED" } }, 401) };
  }

  const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
    headers: { "Authorization": "Bearer " + accessToken, "apikey": supabaseSecretKey }
  });
  if (!userRes.ok) {
    return { fail: json({ error: { message: "SESSION_EXPIRED" } }, 401) };
  }
  const user = await userRes.json();

  const profileRes = await fetch(supabaseUrl + "/rest/v1/profiles?id=eq." + user.id + "&select=free_uses_remaining,pro_until", {
    headers: { "apikey": supabaseSecretKey, "Authorization": "Bearer " + supabaseSecretKey }
  });
  const profiles = await profileRes.json();
  const profile = profiles && profiles[0];

  const now = new Date();
  const isPro = profile && profile.pro_until && new Date(profile.pro_until) > now;

  if (!isPro) {
    if (!profile || profile.free_uses_remaining <= 0) {
      return { fail: json({ error: { message: "NO_CREDITS" } }, 403) };
    }
    await fetch(supabaseUrl + "/rest/v1/profiles?id=eq." + user.id, {
      method: "PATCH",
      headers: {
        "apikey": supabaseSecretKey,
        "Authorization": "Bearer " + supabaseSecretKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ free_uses_remaining: profile.free_uses_remaining - 1 })
    });
  }

  return { ok: true, body };
}

async function handleGrade(request, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: { message: "Server is missing ANTHROPIC_API_KEY." } }, 500);
  }

  try {
    const access = await checkAccess(request, env);
    if (access.fail) return access.fail;

    const { system, content } = access.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        system: system,
        messages: [{ role: "user", content: content }]
      })
    });

    const data = await response.json();
    if (!response.ok) return json({ error: data }, response.status);
    return json(data, 200);
  } catch (err) {
    return json({ error: { message: err.message } }, 500);
  }
}

async function handleConsumeCredit(request, env) {
  try {
    const access = await checkAccess(request, env);
    if (access.fail) return access.fail;
    return json({ allowed: true }, 200);
  } catch (err) {
    return json({ error: { message: err.message } }, 500);
  }
}
