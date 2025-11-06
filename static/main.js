const WS_URL = "wss://solange-acinaceous-kayson.ngrok-free.dev/ws";
const API_BUY = "/buy";

let stockData = [];
let currentCategory = null;
let socket;

// --- Connexion WebSocket ---
function connectWS() {
  socket = new WebSocket(WS_URL);

  socket.addEventListener("open", () => console.log("✅ WebSocket connecté"));

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (Array.isArray(data)) stockData = data;
    else {
      const idx = stockData.findIndex(i => i.token === data.token);
      if (idx !== -1) stockData[idx] = data;
      else stockData.push(data);
    }
    if (currentCategory) renderItems(currentCategory);
    else renderCategories();
  });

  socket.addEventListener("close", () => {
    setTimeout(connectWS, 3000);
  });
}

// --- Catégories ---
function renderCategories() {
  const categoriesDiv = document.getElementById("categories");
  const itemsDiv = document.getElementById("items");
  itemsDiv.innerHTML = "";
  currentCategory = null;
  categoriesDiv.innerHTML = "";

  const categories = [...new Set(stockData.map(i => i.category))];

  categories.forEach(cat => {
    const count = stockData.filter(i => i.category === cat && i.available).length;
    const btn = document.createElement("div");
    btn.className = "category-btn";
    btn.innerHTML = `<strong>${escapeHTML(cat)}</strong><span>${count} dispo</span>`;
    btn.addEventListener("click", () => renderItems(cat));
    categoriesDiv.appendChild(btn);
  });

  showMessage("");
}

// --- Items ---
function renderItems(category) {
  const categoriesDiv = document.getElementById("categories");
  const itemsDiv = document.getElementById("items");
  categoriesDiv.innerHTML = "";
  currentCategory = category;
  itemsDiv.innerHTML = "";

  const items = stockData.filter(i => i.category === category && i.available);
  if (items.length === 0) return showMessage("Aucun article disponible");

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <h3>${escapeHTML(item.category)}</h3>
      <p><strong>Montant :</strong> ${item.montant}</p>
      <button>Acheter</button>
    `;
    div.querySelector("button").addEventListener("click", () => buyItem(item.token));
    itemsDiv.appendChild(div);
  });
}

// --- Achat ---
async function buyItem(token) {
  try {
    const res = await fetch(API_BUY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token })
    });
    const text = await res.text();
    const result = JSON.parse(text);
    showMessage(result.message || text, res.ok ? "success" : "error");
  } catch (e) {
    showMessage("Erreur achat : " + e.message, "error");
  }
}

// --- Message ---
function showMessage(msg, type = "success") {
  const existing = document.querySelector(".msg");
  if (existing) existing.remove();
  if (!msg) return;
  const div = document.createElement("div");
  div.className = `msg ${type}`;
  div.innerText = msg;
  document.body.appendChild(div);
  setTimeout(() => (div.style.opacity = "1"), 50);
  setTimeout(() => {
    div.style.opacity = "0";
    setTimeout(() => div.remove(), 500);
  }, 4000);
}

// --- Sécurité HTML ---
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
  );
}

// --- Boutons ---
document.getElementById("backButton").addEventListener("click", renderCategories);
document.getElementById("monCompte").addEventListener("click", () => {
  window.location.href = "/mon_compte";
});

// --- Particules animées ---
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");
let w = (canvas.width = window.innerWidth);
let h = (canvas.height = window.innerHeight);
window.addEventListener("resize", () => {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
});

const particles = Array.from({ length: 80 }, () => ({
  x: Math.random() * w,
  y: Math.random() * h,
  r: Math.random() * 2 + 1,
  dx: (Math.random() - 0.5) * 0.4,
  dy: (Math.random() - 0.5) * 0.4,
  alpha: Math.random() * 0.6 + 0.3
}));

function drawParticles() {
  ctx.clearRect(0, 0, w, h);
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(138,124,255,${p.alpha})`;
    ctx.fill();
    p.x += p.dx;
    p.y += p.dy;
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;
  });
  requestAnimationFrame(drawParticles);
}
drawParticles();

// --- Init ---
document.addEventListener("DOMContentLoaded", connectWS);
