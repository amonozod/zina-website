// Checks sign-in + free-use/Pro status and consumes one credit if allowed.
// Used to gate Listening/Reading tests, which have their own built-in scoring
// and don't need to call Claude at all.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: "Server is missing SUPABASE_URL or SUPABASE_SECRET_KEY." } }) };
  }

  try {
    const { accessToken } = JSON.parse(event.body);

    if (!accessToken) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: "SIGN_IN_REQUIRED" } }) };
    }

    const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { "Authorization": "Bearer " + accessToken, "apikey": supabaseSecretKey }
    });
    if (!userRes.ok) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: "SESSION_EXPIRED" } }) };
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
        return { statusCode: 403, body: JSON.stringify({ error: { message: "NO_CREDITS" } }) };
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

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allowed: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: err.message } }) };
  }
};
