// === Boutons ===
document.getElementById("loginBtn").addEventListener("click", () => {
  window.location.href = "/auth"; // vers ta page de connexion
});

document.getElementById("stockBtn").addEventListener("click", () => {
  window.location.href = "/shop"; // vers ta page de stock
});

// === Particules animées ===
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");
let w = (canvas.width = window.innerWidth);
let h = (canvas.height = window.innerHeight);

window.addEventListener("resize", () => {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
});

const particles = Array.from({ length: 100 }, () => ({
  x: Math.random() * w,
  y: Math.random() * h,
  r: Math.random() * 2 + 1,
  dx: (Math.random() - 0.5) * 0.4,
  dy: (Math.random() - 0.5) * 0.4,
  alpha: Math.random() * 0.6 + 0.3,
}));

function drawParticles() {
  ctx.clearRect(0, 0, w, h);
  particles.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139,124,255,${p.alpha})`;
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
