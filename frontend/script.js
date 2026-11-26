
const API_BASE = "https://spendwise-expense-tracker-0zi2.onrender.com";
const API_URL = `${API_BASE}/api/transactions`;
const AUTH_URL = `${API_BASE}/api/auth`;

let transactions = [];
let expenseChart = null;
let monthlyChart = null;
let currentUser = null;
let selectedMonth = "all";

const $ = (id) => document.getElementById(id);

/* ---------- MONEY FORMAT ---------- */

const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    }).format(Number(amount) || 0);

/* ---------- CHART THEME ---------- */
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CHART_PALETTE = [
    "#4338ca", "#e07a6d", "#3fa58a", "#e0a64a", "#6b84c9", "#9a7fd1",
    "#d9779a", "#8b90a0", "#3a9cb0", "#c98b3c", "#5f9f6b", "#6b6f85"
];
if (typeof Chart !== "undefined") {
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = "#5a6075";
    Chart.defaults.plugins.tooltip.backgroundColor = "#1e2130";
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.boxPadding = 5;
    Chart.defaults.plugins.tooltip.usePointStyle = true;
    Chart.defaults.plugins.tooltip.titleFont = { weight: "600", size: 12 };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12.5 };
    Chart.defaults.plugins.legend.labels.color = "#5a6075";
}
const chartAnimation = prefersReducedMotion
    ? false
    : { duration: 800, easing: "easeOutQuart" };

/* ---------- CATEGORY ICONS (minimal line icons) ---------- */
const ICON = {
    food: "M7 3v8M4 3v5a3 3 0 0 0 3 3M10 3v5a3 3 0 0 1-3 3M7 11v10M17 3c-2 1.5-3 4-3 7v3h3m0-10v18",
    shopping: "M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2",
    cart: "M3 4h2l2.4 11h10l2-8H6.5M9 20h.01M17 20h.01",
    transport: "M5 4h14a1 1 0 0 1 1 1v11H4V5a1 1 0 0 1 1-1zM4 11h16M8 20v-2M16 20v-2M8 15h.01M16 15h.01",
    travel: "M2 16 22 8l-8 20-3-9-9-3z",
    education: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM19 19v2H6",
    bills: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6",
    bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8z",
    play: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 8.5v7l5.5-3.5z",
    health: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
    salary: "M3 7h18v10H3zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 10v.01M18 14v.01",
    laptop: "M4 5h16v11H4zM2 19h20",
    trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
    home: "M4 11 12 4l8 7v9H4zM10 20v-6h4v6",
    briefcase: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
    sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z",
    phone: "M8 3h8v18H8zM11 18h2",
    gift: "M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2 0-4-1-3.5-2.5S11 3 12 7c1-4 3-3.5 3.5-2S14 7 12 7z",
    shield: "M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6z",
    box: "M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8",
    folder: "M3 6h6l2 2h10v11H3z"
};
const categoryStyles = {
    "food": ["food", "#c9782a"],
    "food & dining": ["food", "#c9782a"],
    "groceries": ["cart", "#4f9a5e"],
    "shopping": ["shopping", "#b5497f"],
    "travel": ["travel", "#3b7ea1"],
    "transport": ["transport", "#3b7ea1"],
    "education": ["education", "#4a6fc3"],
    "bills": ["bills", "#7a68c9"],
    "utilities": ["bolt", "#b7911f"],
    "entertainment": ["play", "#9a5fc0"],
    "healthcare": ["health", "#cf5a4e"],
    "health": ["health", "#cf5a4e"],
    "salary": ["salary", "#1b8a5f"],
    "freelance": ["laptop", "#2c9a8f"],
    "investment": ["trend", "#1b8a5f"],
    "rent": ["home", "#8a6d4b"],
    "housing": ["home", "#8a6d4b"],
    "business": ["briefcase", "#566184"],
    "personal care": ["sparkle", "#c46a9a"],
    "subscriptions": ["phone", "#5a6cc4"],
    "gifts": ["gift", "#c9566d"],
    "insurance": ["shield", "#3f8f8f"],
    "other": ["box", "#7b8194"]
};
function svgIcon(path) {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
}
function getCategoryStyle(category) {
    const key = String(category || "Other").trim().toLowerCase();
    return categoryStyles[key] || ["folder", "#7b8194"];
}
function categoryIconHTML(category) {
    const [name, tone] = getCategoryStyle(category);
    return `<span class="category-icon" style="--tone:${tone}" aria-hidden="true">${svgIcon(ICON[name])}</span>`;
}

/* ---------- DATE FORMAT ---------- */
function formatDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return String(value || "");
    return new Date(+match[1], +match[2] - 1, +match[3]).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

/* ---------- TOASTS AND CONFIRM DIALOG ---------- */
function showToast(message, type = "success") {
    const region = $("toastRegion");
    if (!region) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "error" : ""}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.innerHTML = `${svgIcon(type === "error"
        ? "M12 8v5M12 16.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
        : "M20 6 9 17l-5-5")}<span>${escapeHTML(message)}</span>`;
    region.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("leaving");
        setTimeout(() => toast.remove(), prefersReducedMotion ? 0 : 260);
    }, type === "error" ? 5000 : 3000);
}

function closeOverlay(overlay, after) {
    if (!overlay || overlay.hidden || overlay.classList.contains("closing")) return;
    const finish = () => {
        overlay.hidden = true;
        overlay.classList.remove("closing");
        if (after) after();
    };
    if (prefersReducedMotion) return finish();
    overlay.classList.add("closing");
    setTimeout(finish, 200);
}

function confirmDialog({ title, message, confirmLabel = "Delete" }) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
            <section class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">
                <span class="confirm-icon">${svgIcon("M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3")}</span>
                <h2 id="confirmTitle">${escapeHTML(title)}</h2>
                <p>${escapeHTML(message)}</p>
                <div class="modal-actions">
                    <button type="button" class="secondary-btn" data-answer="no">Cancel</button>
                    <button type="button" class="primary-btn danger-btn" data-answer="yes">${escapeHTML(confirmLabel)}</button>
                </div>
            </section>`;
        document.body.appendChild(overlay);
        const answer = (value) => {
            document.removeEventListener("keydown", onKey, true);
            overlay.hidden = false;
            closeOverlay(overlay, () => overlay.remove());
            resolve(value);
        };
        const onKey = (event) => {
            if (event.key === "Escape") { event.stopPropagation(); answer(false); }
        };
        document.addEventListener("keydown", onKey, true);
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) answer(false);
            const button = event.target.closest("[data-answer]");
            if (button) answer(button.dataset.answer === "yes");
        });
        overlay.querySelector('[data-answer="no"]').focus();
    });
}

/* ---------- API REQUEST ---------- */

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401 && currentUser) {
            currentUser = null;
            showAuthScreen("login");
        }

        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}

/* ---------- HTML SAFETY ---------- */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

/* ---------- AUTHENTICATION SCREEN ---------- */

function createAuthScreen() {
    if ($("spendwiseAuth")) return;

    const check = '<svg class="icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>';
    const screen = document.createElement("div");
    screen.id = "spendwiseAuth";
    screen.hidden = true;

    screen.innerHTML = `
        <aside class="sw-auth-aside">
            <div class="sw-auth-brand">
                <span class="sw-auth-logo">S</span>
                SpendWise
            </div>
            <div>
                <h1>Know where your money goes.</h1>
                <ul>
                    <li>${check} Track income and expenses in one place</li>
                    <li>${check} See monthly cash flow and spending by category</li>
                    <li>${check} Export your records to Excel anytime</li>
                </ul>
            </div>
            <small>© 2026 SpendWise</small>
        </aside>
        <div class="sw-auth-main">
        <section class="sw-auth-card">
            <div class="sw-auth-brand">
                <span class="sw-auth-logo">S</span>
                SpendWise
            </div>

            <h2 id="swAuthTitle">Welcome back!</h2>
            <p class="sw-auth-description" id="swAuthDescription">
                Log in to manage your personal finances.
            </p>

            <form id="swAuthForm">
                <div id="swNameField" hidden>
                    <label for="swAuthName">Full name</label>
                    <input
                        id="swAuthName"
                        name="name"
                        maxlength="80"
                        autocomplete="name"
                        placeholder="Your name"
                    >
                </div>

                <label for="swAuthEmail">Email address</label>
                <input
                    id="swAuthEmail"
                    name="email"
                    type="email"
                    maxlength="254"
                    required
                    autocomplete="email"
                    placeholder="you@example.com"
                >

                <label for="swAuthPassword">Password</label>
                <input
                    id="swAuthPassword"
                    name="password"
                    type="password"
                    minlength="8"
                    maxlength="128"
                    required
                    autocomplete="current-password"
                    placeholder="At least 8 characters"
                >

                <button
                    class="sw-auth-submit"
                    id="swAuthSubmit"
                    type="submit"
                >
                    Log In
                </button>

                <p
                    class="sw-auth-message"
                    id="swAuthMessage"
                    role="alert"
                ></p>
            </form>

            <div class="sw-auth-switch">
                <span id="swAuthSwitchText">New to SpendWise?</span>
                <button id="swAuthSwitchButton" type="button">
                    Create account
                </button>
            </div>
        </section>
        </div>
    `;

    document.body.appendChild(screen);

    $("swAuthForm").addEventListener("submit", submitAuthForm);

    $("swAuthSwitchButton").addEventListener("click", () => {
        showAuthScreen(authMode === "login" ? "register" : "login");
    });
}

let authMode = "login";

function showAuthScreen(mode = "login", message = "") {
    createAuthScreen();
    authMode = mode;

    $("swAuthTitle").textContent =
        mode === "login" ? "Welcome back!" : "Create your account";

    $("swAuthDescription").textContent =
        mode === "login"
            ? "Log in to manage your personal finances."
            : "Join SpendWise and start tracking your money.";

    $("swNameField").hidden = mode !== "register";
    $("swAuthName").required = mode === "register";

    $("swAuthPassword").autocomplete =
        mode === "login" ? "current-password" : "new-password";

    $("swAuthSubmit").textContent =
        mode === "login" ? "Log In" : "Create Account";

    $("swAuthSwitchText").textContent =
        mode === "login"
            ? "New to SpendWise?"
            : "Already have an account?";

    $("swAuthSwitchButton").textContent =
        mode === "login" ? "Create account" : "Log in";

    $("swAuthMessage").textContent = message;
    $("swAuthMessage").classList.toggle("info", Boolean(message));
    $("spendwiseAuth").hidden = false;

    const appContainer = document.querySelector(".app-container");
    if (appContainer) appContainer.inert = true;

    $("swAuthEmail").focus();
}

function hideAuthScreen() {
    $("spendwiseAuth").hidden = true;

    const appContainer = document.querySelector(".app-container");
    if (appContainer) appContainer.inert = false;
}

async function submitAuthForm(event) {
    event.preventDefault();
    $("swAuthMessage").classList.remove("info");

    const name = $("swAuthName").value.trim();
    const email = $("swAuthEmail").value.trim();
    const password = $("swAuthPassword").value;
    const isRegister = authMode === "register";

    if (isRegister && !name) {
        $("swAuthMessage").textContent = "Please enter your name.";
        return;
    }

    if (password.length < 8) {
        $("swAuthMessage").textContent =
            "Password must contain at least 8 characters.";
        return;
    }

    const button = $("swAuthSubmit");
    button.disabled = true;
    button.textContent = isRegister
        ? "Creating account..."
        : "Logging in...";

    $("swAuthMessage").textContent = "";

    try {
        const data = await apiRequest(
            `${AUTH_URL}/${isRegister ? "register" : "login"}`,
            {
                method: "POST",
                body: JSON.stringify(
                    isRegister
                        ? { name, email, password }
                        : { email, password }
                )
            }
        );

        currentUser = data.user;
        $("swAuthPassword").value = "";

        await startDashboard();
    } catch (error) {
        $("swAuthMessage").textContent = error.message;
    } finally {
        button.disabled = false;
        button.textContent = isRegister ? "Create Account" : "Log In";
    }
}

/* ---------- USER PROFILE AND LOGOUT ---------- */

function setupUserControls() {
    const profile = document.querySelector(".profile");

    if (profile && currentUser) {
        profile.innerHTML = `
            <div class="avatar">
                ${escapeHTML(
                    (currentUser.name || "U").charAt(0).toUpperCase()
                )}
            </div>

            <div style="min-width:0">
                <strong>${escapeHTML(currentUser.name || "User")}</strong>
                <small>${escapeHTML(currentUser.email || "")}</small>
            </div>
        `;
    }

    updateGreeting();

    let logoutButton = $("swLogoutBtn");

    if (!logoutButton) {
        logoutButton = document.createElement("button");
        logoutButton.id = "swLogoutBtn";
        logoutButton.className = "logout-btn";
        logoutButton.type = "button";
        logoutButton.textContent = "Log Out";

        const sidebarBottom = document.querySelector(".sidebar-bottom");
        if (sidebarBottom) sidebarBottom.appendChild(logoutButton);
    }

    logoutButton.onclick = logoutUser;
    logoutButton.hidden = !currentUser;
}

function updateGreeting() {
    const hour = new Date().getHours();
    const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    const firstName = String(currentUser?.name || "").trim().split(/\s+/)[0];

    if ($("greeting")) {
        $("greeting").textContent = firstName
            ? `Good ${part}, ${firstName}`
            : "Dashboard";
    }

    if ($("todayDate")) {
        $("todayDate").textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
        });
    }
}

async function logoutUser() {
    const button = $("swLogoutBtn");
    if (button) button.disabled = true;

    try {
        await apiRequest(`${AUTH_URL}/logout`, { method: "POST" });
    } catch (error) {
        console.error("Logout request failed:", error);
    } finally {
        currentUser = null;
        transactions = [];
        selectedMonth = "all";
        document.querySelector(".app-container")?.classList.add("is-loading");
        closeSidebar();

        if (expenseChart) {
            expenseChart.destroy();
            expenseChart = null;
        }

        if (monthlyChart) {
            monthlyChart.destroy();
            monthlyChart = null;
        }

        showAuthScreen("login", "You have been logged out.");

        if (button) button.disabled = false;
    }
}

/* ---------- MONTH FILTER ---------- */

function ensureMonthFilter() {
    let filter = $("monthFilter");
    if (filter) return filter;

    const slot = $("monthFilterSlot");
    if (!slot) return null;

    const wrapper = document.createElement("div");
    wrapper.className = "month-filter";

    wrapper.innerHTML = `
        <label for="monthFilter">View month</label>
        <select id="monthFilter">
            <option value="all">All Months</option>
        </select>
    `;

    slot.appendChild(wrapper);

    filter = $("monthFilter");

    filter.addEventListener("change", () => {
        selectedMonth = filter.value;
        renderDashboard();
    });

    return filter;
}

function populateMonthFilter() {
    const filter = ensureMonthFilter();
    if (!filter) return;

    const previousMonth = selectedMonth || filter.value || "all";

    const months = [...new Set(
        transactions
            .map(t => String(t.date || "").slice(0, 7))
            .filter(month => /^\d{4}-\d{2}$/.test(month))
    )].sort().reverse();

    filter.innerHTML = '<option value="all">All Months</option>';

    months.forEach(month => {
        const [year, monthNumber] = month.split("-").map(Number);
        const option = document.createElement("option");

        option.value = month;
        option.textContent = new Date(year, monthNumber - 1, 1)
            .toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric"
            });

        filter.appendChild(option);
    });

    selectedMonth = months.includes(previousMonth)
        ? previousMonth
        : "all";

    filter.value = selectedMonth;
}

function getVisibleTransactions() {
    return transactions.filter(transaction =>
        selectedMonth === "all" ||
        String(transaction.date || "").startsWith(selectedMonth)
    );
}

/* ---------- MONTHLY CHART CONTAINER ---------- */

function ensureMonthlyChart() {
    if ($("monthlyChart")) return $("monthlyChart");

    const main = document.querySelector(".main-content");
    if (!main) return null;

    const section = document.createElement("section");
    section.className = "panel";
    section.id = "monthlyCashFlowPanel";
    section.style.marginBottom = "24px";

    section.innerHTML = `
        <div class="panel-heading">
            <div>
                <h3>Monthly Cash Flow</h3>
                <p>Compare your income and expenses each month</p>
            </div>

            <span class="pill">Monthly overview</span>
        </div>

        <div class="sw-monthly-chart-container">
            <canvas id="monthlyChart"></canvas>
        </div>
    `;

    const contentGrid = document.querySelector(".content-grid");

    if (contentGrid) {
        contentGrid.insertAdjacentElement("afterend", section);
    } else {
        main.insertBefore(section, main.firstChild);
    }

    return $("monthlyChart");
}

/* ---------- DASHBOARD SUMMARY ---------- */

function renderDashboard() {
    const visibleTransactions = getVisibleTransactions();

    const income = visibleTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const expenses = visibleTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const balance = income - expenses;

    const savingsRate = income > 0
        ? (balance / income) * 100
        : 0;

    if ($("totalBalance")) {
        $("totalBalance").textContent = money(balance);
    }

    if ($("totalIncome")) {
        $("totalIncome").textContent = money(income);
    }

    if ($("totalExpenses")) {
        $("totalExpenses").textContent = money(expenses);
    }

    if ($("savingsRate")) {
        $("savingsRate").textContent =
            `${Number.isFinite(savingsRate) ? savingsRate.toFixed(1) : "0.0"}%`;
    }

    if ($("savingsMeter")) {
        const meter = Number.isFinite(savingsRate)
            ? Math.min(100, Math.max(0, savingsRate))
            : 0;
        $("savingsMeter").style.width = `${meter}%`;
    }

    if ($("transactionCount")) {
        $("transactionCount").textContent = visibleTransactions.length;
    }

    if ($("financialInsight")) {
        if (visibleTransactions.length === 0) {
            $("financialInsight").textContent =
                "No transactions for this period. Add income or expenses to see your financial summary.";
        } else if (balance < 0) {
            $("financialInsight").textContent =
                "Your expenses exceed your income. Review your spending.";
        } else if (income === 0) {
            $("financialInsight").textContent =
                "Add your income to understand your savings rate.";
        } else {
            $("financialInsight").textContent =
                `You have retained ${money(balance)} from ${money(income)} in income.`;
        }
    }

    const categoryTotals = {};

    visibleTransactions
        .filter(t => t.type === "expense")
        .forEach(t => {
            const category = t.category || "Other";

            categoryTotals[category] =
                (categoryTotals[category] || 0) +
                (Number(t.amount) || 0);
        });

    const topCategory = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];

    if ($("topCategory")) {
        $("topCategory").innerHTML = topCategory
            ? `${categoryIconHTML(topCategory[0])}<span>${escapeHTML(topCategory[0])}</span>`
            : "—";
    }

    renderExpenseChart(categoryTotals);
    renderMonthlyChart();
    renderTransactionList();
}

/* ---------- EXPENSE BREAKDOWN CHART ---------- */
function renderExpenseChart(categoryTotals) {
    const canvas = $("expenseChart");
    if (!canvas || typeof Chart === "undefined") return;

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);
    const total = values.reduce((sum, value) => sum + value, 0);

    if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null;
    }

    // Shows the real expense total inside the doughnut.
    const centerText = {
        id: "centerText",
        afterDraw(chart) {
            const arc = chart.getDatasetMeta(0).data[0];
            if (!arc) return;

            const { ctx } = chart;
            const maxWidth = arc.innerRadius * 1.5;
            const amountText = labels.length ? money(total) : "No expenses";

            let size = 22;
            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `800 ${size}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
            while (ctx.measureText(amountText).width > maxWidth && size > 11) {
                size -= 1;
                ctx.font = `800 ${size}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
            }
            ctx.fillStyle = labels.length ? "#1e2130" : "#8b90a0";
            ctx.fillText(amountText, arc.x, arc.y + (labels.length ? 8 : 0));

            if (labels.length) {
                ctx.font = "500 11.5px 'Inter', sans-serif";
                ctx.fillStyle = "#8b90a0";
                ctx.fillText("Total spent", arc.x, arc.y - 14);
            }
            ctx.restore();
        }
    };

    expenseChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: labels.length ? labels : ["No expenses"],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: labels.length
                    ? labels.map((_, index) => CHART_PALETTE[index % CHART_PALETTE.length])
                    : ["#eceae5"],
                borderWidth: 0,
                hoverOffset: 6,
                borderRadius: 4,
                spacing: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            animation: chartAnimation === false
                ? false
                : { ...chartAnimation, animateRotate: true, animateScale: true },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        padding: 14,
                        boxWidth: 8,
                        boxHeight: 8
                    }
                },
                tooltip: {
                    enabled: labels.length > 0,
                    callbacks: {
                        label: context => {
                            const share = total > 0
                                ? ` (${((context.raw / total) * 100).toFixed(1)}%)`
                                : "";
                            return ` ${context.label}: ${money(context.raw)}${share}`;
                        }
                    }
                }
            }
        },
        plugins: [centerText]
    });
}

/* ---------- MONTHLY INCOME VS EXPENSES ---------- */
function renderMonthlyChart() {
    const canvas = ensureMonthlyChart();
    if (!canvas || typeof Chart === "undefined") return;

    const monthlyTotals = {};

    transactions.forEach(transaction => {
        const month = String(transaction.date || "").slice(0, 7);

        if (!/^\d{4}-\d{2}$/.test(month)) return;

        if (!monthlyTotals[month]) {
            monthlyTotals[month] = {
                income: 0,
                expense: 0
            };
        }

        if (transaction.type === "income") {
            monthlyTotals[month].income +=
                Number(transaction.amount) || 0;
        } else if (transaction.type === "expense") {
            monthlyTotals[month].expense +=
                Number(transaction.amount) || 0;
        }
    });

    const months = Object.keys(monthlyTotals).sort();

    const labels = months.map(month => {
        const [year, monthNumber] = month.split("-").map(Number);

        return new Date(year, monthNumber - 1, 1)
            .toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric"
            });
    });

    if (monthlyChart) {
        monthlyChart.destroy();
        monthlyChart = null;
    }

    monthlyChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels.length ? labels : ["No data yet"],
            datasets: [
                {
                    label: "Income",
                    data: months.length
                        ? months.map(month => monthlyTotals[month].income)
                        : [0],
                    backgroundColor: "#3fa58a",
                    hoverBackgroundColor: "#1b8a5f",
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 36
                },
                {
                    label: "Expenses",
                    data: months.length
                        ? months.map(month => monthlyTotals[month].expense)
                        : [0],
                    backgroundColor: "#e58a7f",
                    hoverBackgroundColor: "#cf5a4e",
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 36
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: chartAnimation,
            interaction: {
                mode: "index",
                intersect: false
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: "#8b90a0" }
                },
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    grid: {
                        color: "rgba(30, 33, 48, 0.07)",
                        borderDash: [4, 4]
                    },
                    ticks: {
                        color: "#8b90a0",
                        maxTicksLimit: 6,
                        callback: value =>
                            new Intl.NumberFormat("en-IN", {
                                notation: "compact",
                                maximumFractionDigits: 1
                            }).format(value)
                    }
                }
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        padding: 18,
                        boxWidth: 8,
                        boxHeight: 8
                    }
                },
                tooltip: {
                    callbacks: {
                        label: context =>
                            ` ${context.dataset.label}: ${money(context.raw)}`
                    }
                }
            }
        }
    });
}

/* ---------- TRANSACTION TABLE WITH CATEGORY ICONS ---------- */
function renderTransactionList() {
    const list = $("transactionList");
    if (!list) return;

    const searchTerm = (
        $("searchInput")?.value || ""
    ).trim().toLowerCase();

    const typeFilter = $("typeFilter")?.value || "all";

    const filtered = getVisibleTransactions().filter(transaction => {
        const matchesSearch = [
            transaction.title,
            transaction.category,
            transaction.type,
            transaction.date
        ].some(value =>
            String(value || "").toLowerCase().includes(searchTerm)
        );

        const matchesType =
            typeFilter === "all" ||
            transaction.type === typeFilter;

        return matchesSearch && matchesType;
    });

    list.innerHTML = filtered.map(transaction => {
        const category = transaction.category || "Other";
        const type = String(transaction.type || "").toLowerCase();
        const isIncome = type === "income";

        return `
            <tr>
                <td class="td-main">
                    <strong class="tx-title">${escapeHTML(transaction.title)}</strong>
                    <span class="sw-type-badge ${isIncome ? "sw-income-badge" : "sw-expense-badge"}">
                        ${isIncome ? "Income" : "Expense"}
                    </span>
                </td>

                <td class="td-cat">
                    <span class="category-label">
                        ${categoryIconHTML(category)}
                        <span>${escapeHTML(category)}</span>
                    </span>
                </td>

                <td class="td-date">${escapeHTML(formatDate(transaction.date))}</td>

                <td class="td-amt num">
                    <span class="tx-amount ${isIncome ? "income-amount" : "expense-amount"}">
                        ${isIncome ? "+" : "−"}${money(transaction.amount)}
                    </span>
                </td>

                <td class="td-act">
                    <div class="sw-transaction-actions">
                        <button
                            type="button"
                            class="row-btn"
                            data-edit="${Number(transaction.id)}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="row-btn danger"
                            data-delete="${Number(transaction.id)}"
                        >
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    const emptyState = $("emptyState");

    if (emptyState) {
        emptyState.hidden = filtered.length > 0;

        if (filtered.length === 0) {
            let mode = "clear";
            let title = "No matching transactions";
            let text = "Try a different search term or filter.";
            let action = "Clear filters";

            if (transactions.length === 0) {
                mode = "add";
                title = "No transactions yet";
                text = "Add your first income or expense to start tracking.";
                action = "Add Transaction";
            } else if (getVisibleTransactions().length === 0) {
                mode = "add";
                title = "No transactions this month";
                text = "Nothing recorded for this period. Add one or pick another month.";
                action = "Add Transaction";
            }

            $("emptyTitle").textContent = title;
            $("emptyText").textContent = text;
            $("emptyActionBtn").textContent = action;
            $("emptyActionBtn").dataset.action = mode;
        }
    }
}

function showSkeletonRows() {
    const list = $("transactionList");
    if (!list || list.children.length) return;

    list.innerHTML = Array.from({ length: 4 }, () => `
        <tr class="skeleton-row">
            <td><span style="width:70%"></span></td>
            <td><span style="width:60%"></span></td>
            <td><span style="width:50%"></span></td>
            <td><span style="width:60%;margin-left:auto"></span></td>
            <td><span style="width:50%;margin-left:auto"></span></td>
        </tr>
    `).join("");
}

function setLoading(isLoading) {
    document.querySelector(".app-container")
        ?.classList.toggle("is-loading", isLoading);
}

/* ---------- ADD / EDIT / DELETE TRANSACTIONS ---------- */
function showFormError(message, field = null) {
    const error = $("formError");

    document.querySelectorAll("#transactionForm [aria-invalid]")
        .forEach(input => input.removeAttribute("aria-invalid"));

    if (field) {
        field.setAttribute("aria-invalid", "true");
        field.focus();
    }

    if (error) {
        error.textContent = message;
        error.hidden = !message;
    }
}

function openTransactionModal(transaction = null) {
    const modal = $("transactionModal");
    const form = $("transactionForm");

    if (!modal || !form) return;

    form.reset();
    showFormError("");

    $("transactionId").value = transaction
        ? transaction.id
        : "";

    $("modalTitle").textContent = transaction
        ? "Edit Transaction"
        : "Add Transaction";

    $("title").value = transaction
        ? transaction.title
        : "";

    $("amount").value = transaction
        ? transaction.amount
        : "";

    $("type").value = transaction
        ? transaction.type
        : "expense";

    $("category").value = transaction
        ? transaction.category
        : "Food";

    $("date").value = transaction
        ? transaction.date
        : new Date().toLocaleDateString("en-CA");

    modal.classList.remove("closing");
    modal.hidden = false;
    $("title").focus();
}

function closeTransactionModal() {
    closeOverlay($("transactionModal"));
}

async function saveTransaction(event) {
    event.preventDefault();

    const id = $("transactionId").value;

    const data = {
        title: $("title").value.trim(),
        amount: Number($("amount").value),
        type: $("type").value,
        category: $("category").value,
        date: $("date").value
    };

    if (!data.title) {
        showFormError("Please enter a transaction name.", $("title"));
        return;
    }

    if (!Number.isFinite(data.amount) || data.amount <= 0) {
        showFormError("Enter an amount greater than zero.", $("amount"));
        return;
    }

    if (!data.date) {
        showFormError("Please choose a date.", $("date"));
        return;
    }

    showFormError("");

    const saveButton = $("saveBtn");
    const saveLabel = saveButton ? saveButton.textContent : "";

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    try {
        await apiRequest(
            id
                ? `${API_URL}/${encodeURIComponent(id)}`
                : API_URL,
            {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(data)
            }
        );

        closeTransactionModal();
        await loadTransactions();
        showToast(id ? "Transaction updated" : "Transaction added");
    } catch (error) {
        if ($("transactionModal").hidden) {
            showToast(error.message, "error");
        } else {
            showFormError(error.message);
        }
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = saveLabel;
        }
    }
}

async function deleteTransaction(id) {
    const transaction = transactions.find(
        t => Number(t.id) === Number(id)
    );

    if (!transaction) return;

    const confirmed = await confirmDialog({
        title: "Delete transaction?",
        message: `Delete "${transaction.title}"? This cannot be undone.`
    });

    if (!confirmed) return;

    try {
        await apiRequest(
            `${API_URL}/${encodeURIComponent(id)}`,
            { method: "DELETE" }
        );

        await loadTransactions();
        showToast("Transaction deleted");
    } catch (error) {
        showToast(error.message, "error");
    }
}

/* ---------- LOAD TRANSACTIONS ---------- */

async function loadTransactions() {
    transactions = await apiRequest(API_URL);

    // Handle APIs that return { transactions: [...] }.
    if (!Array.isArray(transactions)) {
        transactions = Array.isArray(transactions.transactions)
            ? transactions.transactions
            : [];
    }

    setLoading(false);
    populateMonthFilter();
    renderDashboard();
}

/* ---------- START DASHBOARD ---------- */

async function startDashboard() {
    setLoading(true);
    showSkeletonRows();

    try {
        await loadTransactions();
        hideAuthScreen();
        setupUserControls();
    } catch (error) {
        if (
            error.message === "Please log in first" ||
            error.message === "User account not found"
        ) {
            currentUser = null;
            setLoading(false);
            showAuthScreen("login");
            return;
        }

        setLoading(false);
        console.error("Could not load SpendWise:", error);
        showToast(
            "Could not load transactions. Check that the Flask backend is running.",
            "error"
        );
    }
}

async function initializeSpendWise() {
    createAuthScreen();
    ensureMonthFilter();
    ensureMonthlyChart();
    setupEventListeners();

    try {
        const data = await apiRequest(`${AUTH_URL}/me`);

        currentUser = data.user;
        await startDashboard();
    } catch (error) {
        currentUser = null;
        showAuthScreen("login");
    }
}

/* ---------- EVENT LISTENERS ---------- */

function setupEventListeners() {
    setupExportButton();

    $("openModalBtn")?.addEventListener("click", () => {
        openTransactionModal();
    });

    $("closeModalBtn")?.addEventListener(
        "click",
        closeTransactionModal
    );

    $("cancelBtn")?.addEventListener(
        "click",
        closeTransactionModal
    );

    $("transactionForm")?.addEventListener(
        "submit",
        saveTransaction
    );

    $("searchInput")?.addEventListener(
        "input",
        renderTransactionList
    );

    $("typeFilter")?.addEventListener(
        "change",
        renderTransactionList
    );

    $("emptyActionBtn")?.addEventListener("click", () => {
        if ($("emptyActionBtn").dataset.action === "add") {
            openTransactionModal();
            return;
        }

        if ($("searchInput")) $("searchInput").value = "";
        if ($("typeFilter")) $("typeFilter").value = "all";
        renderTransactionList();
    });

    setupNavigation();

    $("transactionList")?.addEventListener("click", event => {
        const editButton = event.target.closest("[data-edit]");
        const deleteButton = event.target.closest("[data-delete]");

        if (editButton) {
            const transaction = transactions.find(
                t => Number(t.id) === Number(editButton.dataset.edit)
            );

            if (transaction) {
                openTransactionModal(transaction);
            }
        }

        if (deleteButton) {
            deleteTransaction(deleteButton.dataset.delete);
        }
    });

    $("transactionModal")?.addEventListener("click", event => {
        if (event.target === $("transactionModal")) {
            closeTransactionModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeTransactionModal();
            closeSidebar();
        }
    });
}

/* ---------- SIDEBAR NAVIGATION ---------- */
function openSidebar() {
    document.body.classList.add("nav-open");
    $("menuToggle")?.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
    document.body.classList.remove("nav-open");
    $("menuToggle")?.setAttribute("aria-expanded", "false");
}

function setupNavigation() {
    const links = [...document.querySelectorAll(".nav-link")];

    $("menuToggle")?.addEventListener("click", () => {
        document.body.classList.contains("nav-open")
            ? closeSidebar()
            : openSidebar();
    });

    $("sidebarOverlay")?.addEventListener("click", closeSidebar);
    links.forEach(link => link.addEventListener("click", closeSidebar));

    // Highlight the navigation link for the section currently in view.
    const sections = links
        .map(link => ({
            link,
            target: document.querySelector(link.getAttribute("href"))
        }))
        .filter(item => item.target)
        // Sections are checked in page order, not menu order.
        .sort((a, b) =>
            a.target.getBoundingClientRect().top -
            b.target.getBoundingClientRect().top
        );

    let ticking = false;

    const updateActive = () => {
        ticking = false;

        let current = sections[0];
        const atBottom =
            window.innerHeight + window.scrollY >=
            document.documentElement.scrollHeight - 4;

        sections.forEach(item => {
            if (item.target.id === "dashboard") return;
            if (item.target.getBoundingClientRect().top <= 140) current = item;
        });

        if (atBottom) current = sections[sections.length - 1];
        if (window.scrollY < 80) current = sections[0];

        links.forEach(link =>
            link.classList.toggle("active", link === current.link)
        );
    };

    window.addEventListener("scroll", () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(updateActive);
        }
    }, { passive: true });
}

/* ---------- EXCEL EXPORT ---------- */

function setupExportButton() {
    const filters = document.querySelector(".filters");

    if (!filters || $("exportExcelBtn")) {
        return;
    }

    const button = document.createElement("button");

    button.id = "exportExcelBtn";
    button.type = "button";
    button.className = "secondary-btn";
    button.innerHTML = `${svgIcon("M12 4v12m0 0-4-4m4 4 4-4M5 20h14")}<span>Export Excel</span>`;

    filters.appendChild(button);

    button.addEventListener("click", async () => {
        const originalHTML = button.innerHTML;

        button.disabled = true;
        button.textContent = "Preparing Excel...";

        let downloadUrl = null;

        try {
            const response = await fetch(
                `${API_URL}/export`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (!response.ok) {
                let message = "Unable to export transactions.";

                try {
                    const errorData = await response.json();
                    message = errorData.error || message;
                } catch {
                    // Use the default error message.
                }

                if (response.status === 401) {
                    message =
                        "Please log in again before exporting.";
                }

                throw new Error(message);
            }

            const blob = await response.blob();

            downloadUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = "SpendWise_Transactions.xlsx";

            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast("Excel export downloaded");
        } catch (error) {
            showToast(
                error.message ||
                "Export failed. Please try again.",
                "error"
            );
        } finally {
            // Delay revoking the URL to allow the download to start.
            if (downloadUrl) {
                setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            }

            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    });
}

/* ---------- START APPLICATION ---------- */

document.addEventListener(
    "DOMContentLoaded",
    initializeSpendWise
);
