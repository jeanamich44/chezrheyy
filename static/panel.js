// panel.js
// Flux : loadAccount -> display history -> click Recharger -> get /api/token -> decode -> multi-hash proof -> POST /api/recharge

// Helper: convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: compute SHA-256 of ArrayBuffer or string (returns ArrayBuffer)
async function sha256Buf(input) {
  if (typeof input === "string") {
    input = new TextEncoder().encode(input);
  }
  return await crypto.subtle.digest("SHA-256", input);
}

// Animate rows when table changes
function animateRows() {
  const tableBody = document.querySelector("#history-table tbody");
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach((row, index) => {
    row.classList.remove("show");
    setTimeout(() => row.classList.add("show"), index * 80);
  });
}

const tbodyObserver = new MutationObserver(() => animateRows());
document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.querySelector("#history-table tbody");
  tbodyObserver.observe(tbody, { childList: true });
});

// Load account and purchases
async function loadAccount() {
  try {
    const res = await fetch("/account", { credentials: "include" });
    if (!res.ok) throw new Error("Impossible de récupérer le compte");
    const data = await res.json();

    document.getElementById("pseudo").textContent = data.pseudo || "---";
    document.getElementById("balance").textContent = (Number(data.balance) || 0).toFixed(2);

    const tbody = document.querySelector("#history-table tbody");
    tbody.innerHTML = "";
    const purchases = data.purchases || [];
    purchases.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(p.category || "")}</td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.license_token || "")}</td>
        <td>${(Number(p.montant) || 0).toFixed(2)}</td>
        <td>${(Number(p.price) || 0).toFixed(2)}</td>
        <td>${escapeHtml(p.purchased_at || "")}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    // fail silently in UI, but log
  }
}

// Minimal escaping to avoid injection from server fields
function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// === Token + proof logic ===
const MULTI_HASH_ITERS = 5000; // same number as server
const XOR_KEY = 0x3A;

async function fetchServerToken() {
  const res = await fetch("/api/token", { credentials: "include" });
  if (!res.ok) throw new Error("Impossible d'obtenir le token");
  const json = await res.json();
  return { encodedToken: json.tk, challenge: json.ch };
}

function decodeXorBase64(encoded) {
  const bin = atob(encoded);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i) ^ XOR_KEY;
  }
  let token = "";
  for (let i = 0; i < arr.length; i++) token += String.fromCharCode(arr[i]);
  return token;
}

// compute multi-hash proof returning base64 of final hash bytes
async function computeProof(ts, challenge, token) {
  const combined = ts + challenge + token;
  let hashBuf = await sha256Buf(combined);
  for (let i = 0; i < MULTI_HASH_ITERS; i++) {
    hashBuf = await sha256Buf(hashBuf);
    if ((i & 1023) === 0) await new Promise(r => setTimeout(r, 0));
  }
  return arrayBufferToBase64(hashBuf);
}

// Generate token + proof flow; returns { tokenForServer (base64), proof, ts }
async function getTokenProof() {
  const { encodedToken, challenge } = await fetchServerToken();
  const tokenStr = decodeXorBase64(encodedToken);
  const ts = Math.floor(Date.now() / 1000).toString();
  const proof = await computeProof(ts, challenge, tokenStr);
  const tokenForServer = btoa(tokenStr);
  return { tokenForServer, proof, ts };
}

// === Recharge flow ===
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("rechargeBtn");
  const resultEl = document.getElementById("result");

  btn.addEventListener("click", async () => {
    const amount = parseFloat(document.getElementById("amount").value);
    if (!amount || amount <= 0) {
      resultEl.textContent = "Veuillez entrer un montant valide.";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Traitement...";
    resultEl.textContent = "Obtention token sécurisé...";

    try {
      const { tokenForServer, proof, ts } = await getTokenProof();

      resultEl.textContent = "Envoi de la demande...";

      const res = await fetch("/api/recharge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          token: tokenForServer,
          proof: proof,
          ts: ts
        })
      });

      let message = "";
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success) {
          message = `✅ Recharge effectuée : +${Number(amount).toFixed(2)} €`;
          await loadAccount();
        } else {
          message = data.error || "Erreur lors de la recharge";
        }
      } else {
        message = await res.text();
      }

      // Si le message commence par un lien, on le rend cliquable
      // Transforme tous les liens dans le message en liens cliquables
const linkified = message.replace(/(https?:\/\/[^\s]+)/g, url => {
  return `<a href="${url}" target="_blank" style="color:#6a5acd; text-decoration:underline;">${url}</a>`;
});

resultEl.innerHTML = (!res.ok ? "Erreur : " : "") + linkified;


    } catch (err) {
      console.error(err);
      resultEl.textContent = "Erreur : " + (err.message || err);
    } finally {
      btn.disabled = false;
      btn.textContent = "Recharger";
    }
  });

  // initial load
  loadAccount();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  fetch("/logout", { method: "POST" })
    .then(() => (window.location.href = "/auth"))
    .catch(() => (window.location.href = "/auth"));
});