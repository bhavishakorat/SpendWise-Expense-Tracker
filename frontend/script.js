
const API_BASE = "http://127.0.0.1:5000";
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

/* ---------- CATEGORY ICONS ---------- */

const categoryIcons = {
    "food": "🍔",
    "food & dining": "🍔",
    "groceries": "🛒",
    "shopping": "🛍️",
    "travel": "✈️",
    "transport": "🚌",
    "education": "📚",
    "bills": "🧾",
    "utilities": "💡",
    "entertainment": "🎬",
    "healthcare": "💊",
    "health": "💊",
    "salary": "💰",
    "investment": "📈",
    "rent": "🏠",
    "housing": "🏠",
    "business": "💼",
    "personal care": "✨",
    "subscriptions": "📱",
    "gifts": "🎁",
    "insurance": "🛡️",
    "other": "📦"
};

function getCategoryIcon(category) {
    const key = String(category || "Other").trim().toLowerCase();
    return categoryIcons[key] || "📁";
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

    const style = document.createElement("style");
    style.id = "spendwiseAuthStyle";

    style.textContent = `
        #spendwiseAuth {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
            background: #f6f5fc;
            font-family: inherit;
        }

        #spendwiseAuth[hidden] {
            display: none !important;
        }

        .sw-auth-card {
            background: white;
            width: 100%;
            max-width: 420px;
            padding: 34px;
            border-radius: 22px;
            box-shadow: 0 15px 55px rgba(60, 45, 110, .12);
        }

        .sw-auth-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 25px;
            font-weight: 800;
            color: #27243d;
            margin-bottom: 24px;
        }

        .sw-auth-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 14px;
            background: linear-gradient(135deg, #8b6bff, #6248ed);
            color: white;
            font-size: 25px;
        }

        .sw-auth-card h2 {
            margin: 0 0 8px;
            color: #27243d;
        }

        .sw-auth-description {
            color: #85839e;
            font-size: 14px;
            margin-bottom: 24px;
        }

        .sw-auth-card label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            margin: 15px 0 7px;
        }

        .sw-auth-card input {
            box-sizing: border-box;
            width: 100%;
            padding: 12px 13px;
            border: 1px solid #e3e0ef;
            border-radius: 10px;
            font: inherit;
            outline: none;
            background: white;
        }

        .sw-auth-card input:focus {
            border-color: #7961ff;
        }

        .sw-auth-submit {
            width: 100%;
            border: 0;
            border-radius: 11px;
            padding: 13px;
            margin-top: 22px;
            background: #7057f5;
            color: white;
            font-weight: 700;
            font-size: 15px;
            cursor: pointer;
        }

        .sw-auth-submit:disabled {
            opacity: .6;
            cursor: wait;
        }

        .sw-auth-message {
            font-size: 13px;
            margin-top: 14px;
            color: #dc4663;
        }

        .sw-auth-switch {
            margin-top: 20px;
            text-align: center;
            color: #77748f;
            font-size: 14px;
        }

        .sw-auth-switch button {
            border: 0;
            background: none;
            color: #7057f5;
            font-weight: 700;
            cursor: pointer;
        }

        #swLogoutBtn {
            margin-left: 12px;
        }

        @media (max-width: 480px) {
            .sw-auth-card {
                padding: 25px 20px;
            }
        }
    `;

    document.head.appendChild(style);

    const screen = document.createElement("div");
    screen.id = "spendwiseAuth";
    screen.hidden = true;

    screen.innerHTML = `
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

    let logoutButton = $("swLogoutBtn");

    if (!logoutButton) {
        logoutButton = document.createElement("button");
        logoutButton.id = "swLogoutBtn";
        logoutButton.className = "secondary-btn";
        logoutButton.type = "button";
        logoutButton.textContent = "Log Out";

        const topbar = document.querySelector(".topbar");
        if (topbar) topbar.appendChild(logoutButton);
    }

    logoutButton.onclick = logoutUser;
    logoutButton.hidden = !currentUser;
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

    const topbar = document.querySelector(".topbar");
    if (!topbar) return null;

    const wrapper = document.createElement("div");

    wrapper.style.cssText = `
        display:flex;
        align-items:center;
        justify-content:flex-end;
        gap:12px;
        margin:20px 0;
        flex-wrap:wrap;
    `;

    wrapper.innerHTML = `
        <label for="monthFilter" style="color:#77748f">
            View month
        </label>

        <select
            id="monthFilter"
            style="padding:12px;border:1px solid #e3e0ef;border-radius:10px;background:white;min-width:160px"
        >
            <option value="all">All Months</option>
        </select>
    `;

    topbar.insertAdjacentElement("afterend", wrapper);
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
        $("topCategory").textContent = topCategory
            ? `${getCategoryIcon(topCategory[0])} ${topCategory[0]}`
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

    if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null;
    }

    expenseChart = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels: labels.length ? labels : ["No expenses"],

            datasets: [{
                data: values.length ? values : [1],

                backgroundColor: labels.length
                    ? [
                        "#7560f5",
                        "#ff7c91",
                        "#54c6a5",
                        "#ffbd69",
                        "#61a5fa",
                        "#a78bfa",
                        "#f472b6",
                        "#94a3b8",
                        "#22b8cf",
                        "#f59e0b",
                        "#10b981",
                        "#64748b"
                    ]
                    : ["#eceaf4"],

                borderWidth: 0,
                hoverOffset: 10,
                borderRadius: 4,
                spacing: 3
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: "68%",

            // Animate the chart when it is drawn.
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 900,
                easing: "easeOutQuart"
            },

            plugins: {
                legend: {
                    position: "bottom",

                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        padding: 16,
                        boxWidth: 8
                    }
                },

                tooltip: {
                    callbacks: {
                        label: context => {
                            const amount = labels.length
                                ? context.raw
                                : 0;

                            return `${getCategoryIcon(context.label)} ${context.label}: ${money(amount)}`;
                        }
                    }
                }
            }
        }
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

                    backgroundColor: "#54c6a5",
                    hoverBackgroundColor: "#36ad8b",
                    borderRadius: 7,
                    borderSkipped: false,
                    maxBarThickness: 48
                },

                {
                    label: "Expenses",

                    data: months.length
                        ? months.map(month => monthlyTotals[month].expense)
                        : [0],

                    backgroundColor: "#ff7c91",
                    hoverBackgroundColor: "#f45c76",
                    borderRadius: 7,
                    borderSkipped: false,
                    maxBarThickness: 48
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            // Animate bars when the chart is drawn.
            animation: {
                duration: 900,
                easing: "easeOutQuart"
            },

            interaction: {
                mode: "index",
                intersect: false
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    grid: {
                        color: "rgba(130, 120, 160, 0.12)"
                    },

                    ticks: {
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
                        padding: 18
                    }
                },

                tooltip: {
                    callbacks: {
                        label: context =>
                            `${context.dataset.label}: ${money(context.raw)}`
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

        const icon = getCategoryIcon(category);

        return `
            <tr>
                <td>
                    <strong>${escapeHTML(transaction.title)}</strong>
                    <br>
                    <span class="sw-type-badge ${isIncome ? "sw-income-badge" : "sw-expense-badge"}">
                        ${isIncome ? "Income" : "Expense"}
                    </span>
                </td>

                <td>
                    <span class="category-label">
                        <span class="category-icon" aria-hidden="true">
                            ${icon}
                        </span>
                        <span>${escapeHTML(category)}</span>
                    </span>
                </td>

                <td>${escapeHTML(transaction.date)}</td>

                <td style="color:${isIncome ? "#18865b" : "#ff6078"};font-weight:700">
                    ${isIncome ? "+" : "−"}${money(transaction.amount)}
                </td>

                <td>
                    <div class="sw-transaction-actions">
                        <button
                            type="button"
                            class="secondary-btn"
                            data-edit="${Number(transaction.id)}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="secondary-btn"
                            data-delete="${Number(transaction.id)}"
                        >
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    if ($("emptyState")) {
        $("emptyState").hidden = filtered.length > 0;
    }
}

/* ---------- ADD / EDIT / DELETE TRANSACTIONS ---------- */

function openTransactionModal(transaction = null) {
    const modal = $("transactionModal");
    const form = $("transactionForm");

    if (!modal || !form) return;

    form.reset();

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

    modal.hidden = false;
    $("title").focus();
}

function closeTransactionModal() {
    if ($("transactionModal")) {
        $("transactionModal").hidden = true;
    }
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

    if (
        !data.title ||
        !Number.isFinite(data.amount) ||
        data.amount <= 0 ||
        !data.date
    ) {
        alert("Please enter valid transaction details.");
        return;
    }

    const saveButton = $("saveBtn");

    if (saveButton) saveButton.disabled = true;

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
    } catch (error) {
        alert(error.message);
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

async function deleteTransaction(id) {
    const transaction = transactions.find(
        t => Number(t.id) === Number(id)
    );

    if (!transaction) return;

    if (!confirm(
        `Delete "${transaction.title}"? This cannot be undone.`
    )) {
        return;
    }

    try {
        await apiRequest(
            `${API_URL}/${encodeURIComponent(id)}`,
            { method: "DELETE" }
        );

        await loadTransactions();
    } catch (error) {
        alert(error.message);
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

    populateMonthFilter();
    renderDashboard();
}

/* ---------- START DASHBOARD ---------- */

async function startDashboard() {
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
            showAuthScreen("login");
            return;
        }

        console.error("Could not load SpendWise:", error);

        alert(
            "Could not load transactions. Check that the Flask backend is running."
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
        }
    });
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
    button.className = "primary-btn";
    button.textContent = "↓ Export Excel";
    button.style.whiteSpace = "nowrap";
    button.style.marginLeft = "8px";

    filters.appendChild(button);

    button.addEventListener("click", async () => {
        const originalText = button.textContent;

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
        } catch (error) {
            alert(
                error.message ||
                "Export failed. Please try again."
            );
        } finally {
            // Delay revoking the URL to allow the download to start.
            if (downloadUrl) {
                setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            }

            button.disabled = false;
            button.textContent = originalText;
        }
    });
}

/* ---------- START APPLICATION ---------- */

document.addEventListener(
    "DOMContentLoaded",
    initializeSpendWise
);
