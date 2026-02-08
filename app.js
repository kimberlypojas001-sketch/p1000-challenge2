// ₱1000 Challenge PWA - Spending Tracker (mobile-friendly)
// Works with: index.html + styles.css + manifest.json + service-worker.js

const STORAGE_KEY = "p1000_trip_v2";

const els = {
  budgetPerPerson: document.getElementById("budgetPerPerson"),
  peopleInput: document.getElementById("peopleInput"),
  saveSetup: document.getElementById("saveSetup"),
  resetAll: document.getElementById("resetAll"),

  totalBudget: document.getElementById("totalBudget"),
  totalSpent: document.getElementById("totalSpent"),
  moneyLeft: document.getElementById("moneyLeft"),
  perPerson: document.getElementById("perPerson"),

  date: document.getElementById("date"),
  amount: document.getElementById("amount"),
  category: document.getElementById("category"),
  paidBy: document.getElementById("paidBy"),
  desc: document.getElementById("desc"),
  expenseForm: document.getElementById("expenseForm"),
  clearForm: document.getElementById("clearForm"),

  expensesTbody: document.getElementById("expensesTbody"),
  expensesCards: document.getElementById("expensesCards"),

  exportJson: document.getElementById("exportJson"),
  importJson: document.getElementById("importJson"),
};

function peso(n) {
  const v = Number(n || 0);
  return "₱" + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayISO() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[s]));
}

function defaultState() {
  return {
    budgetPerPerson: 1000,
    people: ["Me"],
    expenses: [] // {id, date, category, desc, paidBy, amount}
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.people) || !Array.isArray(s.expenses)) return defaultState();
    return s;
  } catch {
    return defaultState();
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = load();

function normalizePeople(input) {
  const names = (input || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  // Prevent empty list
  return names.length ? names : ["Me"];
}

function totalBudget() {
  return Number(state.budgetPerPerson || 0) * state.people.length;
}

function totalSpent() {
  return state.expenses.reduce((a, e) => a + Number(e.amount || 0), 0);
}

function perPersonTotals() {
  const map = {};
  for (const p of state.people) map[p] = 0;

  for (const e of state.expenses) {
    const name = e.paidBy || "Unknown";
    if (!map.hasOwnProperty(name)) map[name] = 0;
    map[name] += Number(e.amount || 0);
  }
  return map;
}

function renderPaidBy() {
  els.paidBy.innerHTML = "";
  for (const p of state.people) {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    els.paidBy.appendChild(opt);
  }
}

function renderStats() {
  const tb = totalBudget();
  const ts = totalSpent();
  const left = tb - ts;

  els.totalBudget.textContent = peso(tb);
  els.totalSpent.textContent = peso(ts);
  els.moneyLeft.textContent = peso(left);

  const per = perPersonTotals();
  els.perPerson.innerHTML = "";

  for (const p of state.people) {
    const spent = per[p] || 0;
    const budget = Number(state.budgetPerPerson || 0);
    const remain = budget - spent;

    const row = document.createElement("div");
    row.className = "personRow";
    row.innerHTML = `
      <div>
        <b>${escapeHtml(p)}</b><br/>
        <span>Budget ${peso(budget)}</span>
      </div>
      <div style="text-align:right">
        <div><span>Spent</span> <b>${peso(spent)}</b></div>
        <div><span>Left</span> <b>${peso(remain)}</b></div>
      </div>
    `;
    els.perPerson.appendChild(row);
  }
}

function renderExpenses() {
  // Desktop table body
  if (els.expensesTbody) els.expensesTbody.innerHTML = "";
  // Mobile cards container
  if (els.expensesCards) els.expensesCards.innerHTML = "";

  const expenses = [...state.expenses].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  for (const e of expenses) {
    const id = e.id;

    // Desktop row
    if (els.expensesTbody) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(e.date || "")}</td>
        <td>${escapeHtml(e.category || "")}</td>
        <td>${escapeHtml(e.desc || "")}</td>
        <td>${escapeHtml(e.paidBy || "")}</td>
        <td class="right">${peso(e.amount || 0)}</td>
        <td class="right"><button class="actionBtn" data-del="${id}">Delete</button></td>
      `;
      els.expensesTbody.appendChild(tr);
    }

    // Mobile card
    if (els.expensesCards) {
      const card = document.createElement("div");
      card.className = "expenseCard";
      card.innerHTML = `
        <div class="expenseTop">
          <div>
            <div><b>${escapeHtml(e.category || "Other")}</b></div>
            <div class="expenseMeta">${escapeHtml(e.date || "")} • Paid by ${escapeHtml(e.paidBy || "")}</div>
          </div>
          <div class="expenseAmt">${peso(e.amount || 0)}</div>
        </div>

        ${e.desc ? `<div class="expenseDesc">${escapeHtml(e.desc)}</div>` : ""}

        <div class="expenseActions">
          <button class="ghost" data-del="${id}">Delete</button>
        </div>
      `;
      els.expensesCards.appendChild(card);
    }
  }

  // Delete handlers (works for both)
  document.querySelectorAll("button[data-del]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-del");
      state.expenses = state.expenses.filter(x => x.id !== id);
      save();
      rerender();
    };
  });
}

function rerender() {
  // Fill setup inputs
  els.budgetPerPerson.value = state.budgetPerPerson ?? 1000;
  els.peopleInput.value = state.people.join(", ");

  // Form defaults
  if (!els.date.value) els.date.value = todayISO();

  renderPaidBy();

  // Ensure "Paid by" always has a valid value
  if (!state.people.includes(els.paidBy.value)) {
    els.paidBy.value = state.people[0] || "Me";
  }

  renderStats();
  renderExpenses();
}

/* ===== EVENTS ===== */

// Save setup
els.saveSetup.addEventListener("click", () => {
  state.budgetPerPerson = Number(els.budgetPerPerson.value || 0);
  state.people = normalizePeople(els.peopleInput.value || "");
  save();
  rerender();
});

// Reset everything
els.resetAll.addEventListener("click", () => {
  if (confirm("Reset everything? This clears setup + all expenses on this phone.")) {
    state = defaultState();
    save();
    rerender();
  }
});

// Add expense
els.expenseForm.addEventListener("submit", (ev) => {
  ev.preventDefault();

  const amount = Number(els.amount.value || 0);
  if (!(amount > 0)) return;

  const id = (crypto?.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random();

  const expense = {
    id,
    date: els.date.value || todayISO(),
    category: els.category.value || "Other",
    desc: (els.desc.value || "").trim(),
    paidBy: els.paidBy.value || (state.people[0] || "Me"),
    amount: Math.round(amount * 100) / 100
  };

  state.expenses.push(expense);
  save();

  // Clear fields
  els.amount.value = "";
  els.desc.value = "";

  rerender();
});

// Clear form button
els.clearForm.addEventListener("click", () => {
  els.amount.value = "";
  els.desc.value = "";
  els.date.value = todayISO();
  els.category.value = "Food";
  els.paidBy.value = state.people[0] || "Me";
});

// Export JSON
els.exportJson.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "p1000-challenge-trip.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
});

// Import JSON
els.importJson.addEventListener("change", async () => {
  const file = els.importJson.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const incoming = JSON.parse(text);

    if (!incoming || !Array.isArray(incoming.people) || !Array.isArray(incoming.expenses)) {
      alert("Invalid JSON file.");
      return;
    }

    state = incoming;
    save();
    rerender();
    alert("Imported!");
  } catch {
    alert("Could not import file.");
  } finally {
    els.importJson.value = "";
  }
});

/* ===== SERVICE WORKER ===== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

/* ===== BOOT ===== */
rerender();
