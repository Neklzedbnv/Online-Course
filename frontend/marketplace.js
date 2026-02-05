const $ = (id) => document.getElementById(id);

const categories = ["Programming", "Data Science", "Web Development", "AI Basics", "Blockchain", "Mobile Dev"];
let activeCat = "All";
let selectedTier = {};
const tierNames = ["Basic", "Premium", "VIP"];

const pickImage = (cat) => {
  const map = {
    "Programming": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80",
    "Data Science": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80",
    "Web Development": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80",
    "AI Basics": "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1400&q=80",
    "Blockchain": "https://images.unsplash.com/photo-1621504450181-5d356f61d307?auto=format&fit=crop&w=1400&q=80",
    "Mobile Dev": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1400&q=80"
  };
  return map[cat] || map["Programming"];
};

function renderTabs() {
  const tabs = $("tabs");
  if (!tabs) return;

  tabs.innerHTML = "";

  const all = document.createElement("button");
  all.className = `tab ${activeCat === "All" ? "active" : ""}`;
  all.textContent = "All";
  all.onclick = () => {
    activeCat = "All";
    renderTabs();
    refreshUI();
  };
  tabs.appendChild(all);

  categories.forEach((c) => {
    const b = document.createElement("button");
    b.className = `tab ${activeCat === c ? "active" : ""}`;
    b.textContent = c;
    b.onclick = () => {
      activeCat = c;
      renderTabs();
      refreshUI();
    };
    tabs.appendChild(b);
  });
}

function groupByTitle(list) {
  const m = new Map();

  list.forEach((c) => {
    const category = c.category ?? c[2];
    const title = c.title ?? c[3];
    const key = `${category}||${title}`;

    if (!m.has(key)) m.set(key, []);
    m.get(key).push(c);
  });

  for (const arr of m.values()) {
    arr.sort((a, b) => Number(a.tier ?? a[4]) - Number(b.tier ?? b[4]));
  }

  return [...m.entries()].map(([k, arr]) => {
    const [category, title] = k.split("||");
    return { category, title, tiers: arr };
  });
}

function stars() {
  return "★★★★★";
}

function courseCardHTML(item) {
  const img = pickImage(item.category);
  const key = `${item.category}||${item.title}`;
  const chosen = selectedTier[key] ?? 1;

  const chosenCourse =
    item.tiers.find((x) => Number(x.tier ?? x[4]) === chosen) || item.tiers[0];

  const id = chosenCourse.id ?? chosenCourse[0];
  const priceWei = chosenCourse.priceWei ?? chosenCourse[5];
  const priceEth = ethers.formatEther(priceWei);

  const tierButtons = [0, 1, 2].map((t) => {
    const hasTier = item.tiers.some((x) => Number(x.tier ?? x[4]) === t);
    const active = chosen === t ? "active" : "";
    const disabled = hasTier ? "" : "disabled";
    const style = hasTier ? "" : "opacity:.4;cursor:not-allowed;";
    return `<button class="tierBtn ${active}" data-key="${key}" data-tier="${t}" ${disabled} style="${style}">${tierNames[t]}</button>`;
  }).join("");

  return `
    <article class="card">
      <div class="img"><img src="${img}" alt="${item.title}"></div>
      <div class="body">
        <h3 class="title">${item.title}</h3>

        <div class="row">
          <div class="rating">
            <span>5.0</span>
            <span class="stars">${stars()}</span>
          </div>
          <div class="reviews">(${Math.floor(70 + Math.random() * 400)})</div>
        </div>

        <div class="tiers">${tierButtons}</div>

        <div class="bottom">
          <div class="price">${priceEth} <small>ETH</small></div>
          <button class="btn buyBtn" data-id="${String(id)}" data-price="${String(priceWei)}">Buy with ETH</button>
        </div>

        <div class="small">
          Category: <b>${item.category}</b> | courseId: <b>${String(id)}</b>
        </div>
      </div>
    </article>
  `;
}

async function loadCoursesFromChain() {
  const platform = window.shared?.getPlatform?.();
  if (!platform) return [];

  const n = await platform.nextCourseId();
  const list = [];

  for (let i = 0n; i < n; i++) {
    const c = await platform.courses(i);
    const exists = c.exists ?? c[8];
    if (exists) list.push(c);
  }

  return list;
}

function wireTierButtons() {
  document.querySelectorAll(".tierBtn").forEach((btn) => {
    btn.onclick = () => {
      const key = btn.getAttribute("data-key");
      const tier = Number(btn.getAttribute("data-tier"));
      selectedTier[key] = tier;
      refreshUI();
    };
  });
}

function wireBuyButtons() {
  document.querySelectorAll(".buyBtn").forEach((btn) => {
    btn.onclick = async () => {
      try {
        const platform = window.shared?.getPlatform?.();
        if (!platform) throw new Error("Connect wallet first");

        const id = BigInt(btn.getAttribute("data-id"));
        const priceWei = BigInt(btn.getAttribute("data-price"));

        const tx = await platform.enroll(id, { value: priceWei });
        $("out").textContent = `Buying... tx: ${tx.hash}`;
        await tx.wait();

        if (window.shared?.setWalletUI) await window.shared.setWalletUI();
        $("out").textContent = `Enrolled ✅ tx: ${tx.hash}`;
      } catch (e) {
        $("out").textContent = e?.shortMessage || e?.message || "Failed";
      }
    };
  });
}

async function refreshUI() {
  const grid = $("grid");
  if (!grid) return;

  const platform = window.shared?.getPlatform?.();
  if (!platform) {
    grid.innerHTML = `<div class="walletInfo">Connect MetaMask to load courses from blockchain.</div>`;
    return;
  }

  const all = await loadCoursesFromChain();
  const grouped = groupByTitle(all);

  if (grouped.length === 0) {
    grid.innerHTML = `<div class="walletInfo">No courses on-chain yet. Go to <b>Create</b> and create Basic/Premium/VIP tiers.</div>`;
    return;
  }

  const filtered = activeCat === "All" ? grouped : grouped.filter((x) => x.category === activeCat);
  grid.innerHTML = filtered.map(courseCardHTML).join("");

  wireTierButtons();
  wireBuyButtons();
}

window.addEventListener("DOMContentLoaded", () => {
  renderTabs();
  refreshUI();

  const allBtn = $("allBtn");
  if (allBtn) {
    allBtn.onclick = () => {
      activeCat = "All";
      renderTabs();
      refreshUI();
    };
  }

  document.addEventListener("wallet:connected", refreshUI);
  document.addEventListener("wallet:changed", refreshUI);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", refreshUI);
  }
});
