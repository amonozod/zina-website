// Supabase auth: email magic-link sign-in + session helpers.
const SUPABASE_URL = "https://elssmybphjkivaazyvbe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_btjOVabQtxvQ2_wqhUjPVQ_sNLpytrA";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

async function signInWithEmail(email) {
  const cleanUrl = window.location.origin + window.location.pathname;
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: cleanUrl }
  });
  if (error) throw error;
}

async function signOut() {
  await supabaseClient.auth.signOut();
}

// Returns the current access token, or opens the sign-in modal and throws if not signed in.
async function requireAccessToken() {
  const session = await getSession();
  if (!session) {
    const modal = document.getElementById("authModal");
    if (modal) modal.classList.add("show");
    throw new Error("SIGN_IN_REQUIRED");
  }
  return session.access_token;
}

function setupAuthUI() {
  const authBtn = document.getElementById("authBtn");
  const authModal = document.getElementById("authModal");
  const authModalClose = document.getElementById("authModalClose");
  const authSubmit = document.getElementById("authSubmit");
  const authEmailInput = document.getElementById("authEmailInput");
  const authSentMsg = document.getElementById("authSentMsg");

  async function refreshAuthUI() {
    const session = await getSession();
    if (!authBtn) return;
    if (session) {
      authBtn.textContent = session.user.email.split("@")[0] + " ▾";
      authBtn.onclick = async () => {
        if (confirm("Sign out of " + session.user.email + "?")) {
          await signOut();
          refreshAuthUI();
        }
      };
    } else {
      authBtn.textContent = "Sign in";
      authBtn.onclick = () => authModal.classList.add("show");
    }
  }
  refreshAuthUI();

  if (authModalClose) {
    authModalClose.addEventListener("click", () => authModal.classList.remove("show"));
  }
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target.id === "authModal") authModal.classList.remove("show");
    });
  }
  if (authSubmit) {
    authSubmit.addEventListener("click", async () => {
      const email = authEmailInput.value.trim();
      if (!email || !email.includes("@")) { alert("Enter a valid email."); return; }
      authSubmit.disabled = true;
      authSubmit.textContent = "Sending...";
      try {
        await signInWithEmail(email);
        authSentMsg.style.display = "block";
      } catch (e) {
        alert("Error: " + e.message);
      } finally {
        authSubmit.disabled = false;
        authSubmit.textContent = "Send magic link";
      }
    });
  }

  supabaseClient.auth.onAuthStateChange(() => refreshAuthUI());
}

document.addEventListener("DOMContentLoaded", setupAuthUI);
