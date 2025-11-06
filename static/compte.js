const tableBody = document.getElementById("licenses-body");
const messageEl = document.getElementById("message");

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// Récupère le stock depuis l'API
async function fetchLicenses() {
  try {
    const res = await fetch(`/api/licenses?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Impossible de récupérer le stock");
    const licenses = await res.json();
    updateTable(licenses);
  } catch (err) {
    console.error(err);
    messageEl.textContent = "Erreur lors du chargement du stock";
  }
}

// Met à jour le tableau sans supprimer tout pour éviter clignotement
function updateTable(licenses) {
  tableBody.innerHTML = "";
  licenses.forEach(lic => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(lic.token)}</td>
      <td>${escapeHtml(lic.category)}</td>
      <td>${Number(lic.price_eur).toFixed(2)}</td>
      <td>${lic.available ? "✅" : "❌"}</td>
      <td>
        <button class="buyBtn" ${!lic.available ? "disabled" : ""} data-token="${lic.token}">
          Acheter
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
  attachBuyEvents();
}

// Attache les événements click
function attachBuyEvents() {
  document.querySelectorAll(".buyBtn").forEach(btn => {
    btn.onclick = async () => {
      const token = btn.getAttribute("data-token");
      btn.disabled = true;
      messageEl.textContent = "Envoi de la requête d'achat...";
      try {
        const res = await fetch("/buy", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `token=${encodeURIComponent(token)}`
        });
        const text = await res.text();
        messageEl.textContent = text;
      } catch (err) {
        console.error(err);
        messageEl.textContent = "Erreur : " + (err.message || err);
      } finally {
        btn.disabled = false;
      }
    };
  });
}

// Refresh toutes les 10 secondes
fetchLicenses();
setInterval(fetchLicenses, 10000);
