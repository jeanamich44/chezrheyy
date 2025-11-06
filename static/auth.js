// =====================
// 🔐 AUTH.JS COMPLET
// =====================

const API_BASE = "/auth";

// ---- Utilitaires ----
async function apiPost(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Erreur HTTP ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function showMsg(msg, ok = false) {
  const el = document.getElementById("msg");
  el.style.color = ok ? "#8aff8a" : "#ff8f8f";
  el.textContent = msg;
}

// ---- Étape 1 : Handshake ----
async function startHandshake() {
  const h = await apiPost(`${API_BASE}/handshake`, {});
  const clientProof = await sha256Hex(h.nonce);
  return { handshake_id: h.handshake_id, clientProof };
}

// ---- Étape 2 : Request Action ----
async function requestAction(handshake_id, clientProof) {
  return await apiPost(`${API_BASE}/request_action`, {
    handshake_id,
    client_proof: clientProof,
  });
}

// ---- Étape 3 : Login ou Register ----
async function secureAuth(userid, pin, pseudo, mode) {
  const { handshake_id, clientProof } = await startHandshake();
  const { action_id, action_token } = await requestAction(handshake_id, clientProof);

  const endpoint = mode === "login" ? "login" : "register";
  const payload = { action_id, action_token, userid, pin };
  if (mode === "register") payload.pseudo = pseudo;

  return await apiPost(`${API_BASE}/${endpoint}`, payload);
}

// ---- Liaison UI ----
document.addEventListener("DOMContentLoaded", () => {
  const doActionBtn = document.getElementById("doAction");
  const useridInput = document.getElementById("userid");
  const pinInput = document.getElementById("pin");
  const pseudoInput = document.getElementById("pseudo");

  // variable locale pour le mode
  let isLoginMode = true;

  // ---- Toggle connexion / inscription ----
  const toggleBtn = document.getElementById("toggle");
  const title = document.getElementById("title");

  function updateUI() {
    if (isLoginMode) {
      title.textContent = "Connexion";
      pseudoInput.style.display = "none";
      doActionBtn.textContent = "Se connecter";
      toggleBtn.textContent = "S'enregistrer";
    } else {
      title.textContent = "Inscription";
      pseudoInput.style.display = "block";
      doActionBtn.textContent = "S'enregistrer";
      toggleBtn.textContent = "Se connecter";
    }
  }

  toggleBtn.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    updateUI();
  });

  updateUI();

  // ---- Bouton principal ----
  doActionBtn.addEventListener("click", async () => {
    const userid = useridInput.value.trim();
    const pin = pinInput.value.trim();
    const pseudo = pseudoInput.value.trim();

    if (!userid || !pin) {
      showMsg("Veuillez remplir les champs requis.");
      return;
    }

    showMsg("⏳ Vérification en cours...");

    try {
      const mode = isLoginMode ? "login" : "register";
      await secureAuth(userid, pin, pseudo, mode);
      showMsg(
        mode === "login" ? "Connexion réussie ✅" : "Inscription réussie ✅",
        true
      );
      // redirection après succès
      if (mode === "login"){
           setTimeout(() => window.location.href = "/", 800);
      }
    } catch (err) {
      console.error(err);
      showMsg(err.message || "Erreur inconnue");
    }
  });
});
