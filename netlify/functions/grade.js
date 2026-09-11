// This function runs on Netlify's server, NOT in the browser.
// Secret keys stay here and are never sent to the user's browser.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: "Server is missing ANTHROPIC_API_KEY. Set it in Netlify > Site settings > Environment variables." } }) };
  }
  if (!supabaseUrl || !supabaseSecretKey) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: "Server is missing SUPABASE_URL or SUPABASE_SECRET_KEY. Set them in Netlify > Site settings > Environment variables." } }) };
  }

  try {
    const { system, content, accessToken } = JSON.parse(event.body);

    if (!accessToken) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: "SIGN_IN_REQUIRED" } }) };
    }

    // Verify the user's identity using their access token.
    const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { "Authorization": "Bearer " + accessToken, "apikey": supabaseSecretKey }
    });
    if (!userRes.ok) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: "SESSION_EXPIRED" } }) };
    }
    const user = await userRes.json();

    // Look up their free-use balance and Pro status.
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
      // Consume one free use.
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

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: err.message } }) };
  }
};
