// Shared helpers for the embedded AI practice widgets on Writing & Speaking pages.

function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

async function callClaude(system, content) {
  const accessToken = await requireAccessToken();
  const response = await fetch("/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, content, accessToken })
  });
  const data = await response.json();
  if (!response.ok) {
    const msg = (data && data.error && data.error.message) || "Unknown error";
    throw new Error(msg);
  }
  const text = (data.content || []).map(b => b.text || "").join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function imageUrlToBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function renderExamResult(container, json) {
  const criteriaHtml = json.criteria.map(c => `
    <div class="criteria-item">
      <span class="cname">${c.name}</span>
      <span class="cband">${c.band.toFixed(1)}</span>
      <span class="ccomment">${c.comment}</span>
    </div>`).join("");

  const strengths = (json.strengths || []).map(s => `<li>${s}</li>`).join("");
  const improvements = (json.improvements || []).map(s => `<li>${s}</li>`).join("");

  container.innerHTML = `
    <div class="result-card">
      <div class="result-head">
        <div>
          <div class="phase-label" style="color:rgba(255,255,255,0.75);">Overall band score</div>
          <div class="band">${json.overallBand.toFixed(1)}</div>
        </div>
      </div>
      <div class="result-body">
        <div class="criteria-list">${criteriaHtml}</div>
        <div class="fb-cols">
          <div><h4>What worked well</h4><ul>${strengths}</ul></div>
          <div><h4>What to improve</h4><ul>${improvements}</ul></div>
        </div>
      </div>
    </div>`;
}

function friendlyErrorHTML(message) {
  if (message === "SIGN_IN_REQUIRED") {
    return '<div class="error-box">Please sign in above to use AI feedback.</div>';
  }
  if (message === "SESSION_EXPIRED") {
    return '<div class="error-box">Your session expired. Please sign in again.</div>';
  }
  if (message === "NO_CREDITS") {
    return '<div class="error-box">You have used your 2 free AI checks. <a href="pricing.html" style="color:inherit; text-decoration:underline;">Upgrade to Pro</a> for unlimited access.</div>';
  }
  return '<div class="error-box">Could not get a score right now (' + message + ').</div>';
}

function setupSpeechRecognition(onResult) {
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) return null;
  const recognition = new SpeechRecognitionAPI();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.onresult = (e) => {
    let finalText = "";
    for (let i = 0; i < e.results.length; i++) finalText += e.results[i][0].transcript + " ";
    onResult(finalText.trim());
  };
  return recognition;
}
