let currentOverlay = null;

function close() {
  if (currentOverlay && currentOverlay.parentNode) {
    currentOverlay.parentNode.removeChild(currentOverlay);
  }
  currentOverlay = null;
}

export function showPromotionModal() {
  close();

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "promotion-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "60";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = "rgba(0,0,0,0.78)";

    const panel = document.createElement("div");
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.gap = "12px";
    panel.style.padding = "18px 18px 14px";
    panel.style.borderRadius = "14px";
    panel.style.minWidth = "280px";
    panel.style.background =
      "linear-gradient(145deg, rgba(24,17,7,0.97), rgba(41,26,12,0.98))";
    panel.style.boxShadow =
      "0 18px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(240,217,181,0.08)";
    panel.style.color = "#f8f8ff";
    panel.style.fontFamily = "system-ui, sans-serif";

    const title = document.createElement("div");
    title.textContent = "PROMOTE TO";
    title.style.fontWeight = "800";
    title.style.letterSpacing = "0.18em";
    title.style.fontSize = "12px";
    title.style.textTransform = "uppercase";
    title.style.opacity = "0.9";

    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "repeat(4, 1fr)";
    row.style.gap = "10px";

    const options = [
      { id: "q", label: "QUEEN" },
      { id: "r", label: "ROOK" },
      { id: "b", label: "BISHOP" },
      { id: "n", label: "KNIGHT" },
    ];

    options.forEach((o) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = o.label;
      btn.style.padding = "10px 10px";
      btn.style.borderRadius = "12px";
      btn.style.border = "1px solid rgba(255,255,255,0.12)";
      btn.style.background = "rgba(0,0,0,0.25)";
      btn.style.color = "rgba(245,247,250,0.96)";
      btn.style.cursor = "pointer";
      btn.style.fontWeight = "700";
      btn.style.letterSpacing = "0.06em";
      btn.style.textTransform = "uppercase";
      btn.addEventListener("click", () => {
        close();
        resolve(o.id);
      });
      row.appendChild(btn);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        close();
        resolve("q");
      }
    });

    panel.appendChild(title);
    panel.appendChild(row);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    currentOverlay = overlay;
  });
}
