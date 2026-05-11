// ==========================
// AUTH CHECK
// ==========================
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

// ==========================
// GLOBAL STATE
// ==========================
let transactions = [];
let financeChart;
let savingsGoal = 0;
// ==========================
// DETECT PAGE TYPE
// ==========================
const isDashboard = document.getElementById("financeChart") !== null;
const isTransactionsPage = document.getElementById("allTransactionsBody") !== null;
const isAnalyticsPage = document.getElementById("monthlyChart") !== null;

// ==========================
// INIT
// ==========================
document.addEventListener("DOMContentLoaded", async () => {

    // ==========================
    // FETCH SAVINGS GOAL FIRST
    // ==========================
    await fetchSavingsGoal();

    const dateEl = document.getElementById("currentDateDisplay");
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    // only dashboard init
    if (isDashboard) {
        const today = new Date().toISOString().split("T")[0];

        const incomeDate = document.getElementById("incomeDate");
        const expenseDate = document.getElementById("expenseDate");

        if (incomeDate) incomeDate.value = today;
        if (expenseDate) expenseDate.value = today;

        loadTransactions();
        updateGreeting();
    }

    // only transactions page init
    if (isTransactionsPage) {
        loadTransactionsForFilters();
    }

    if (isAnalyticsPage) {
        loadAnalytics();
    }

    if (isBudgetPage) {
        loadBudgetData();
    }
});

// ==========================
// FETCH TRANSACTIONS
// ==========================
async function loadTransactions() {
    try {
        const res = await fetch("https://expense-tracker-rsur.onrender.com/api/transactions", {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Failed to fetch");

        transactions = data;
        refreshUI();
    } catch (err) {
        console.error(err);
        alert("Failed to load transactions");
    }
}

// ==========================
// MODALS
// ==========================
function openIncomeModal() {
    const el = document.getElementById("incomeModal");
    if (el) el.style.display = "block";
}

function openExpenseModal() {
    const el = document.getElementById("expenseModal");
    if (el) el.style.display = "block";
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
}

// ==========================
// ADD INCOME
// ==========================
async function addIncome() {
    const amount = Number(document.getElementById("incomeAmount")?.value);
    const category = document.getElementById("incomeCategory")?.value;
    const date = document.getElementById("incomeDate")?.value;

    await fetch("https://expense-tracker-rsur.onrender.com/api/transactions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            type: "income",
            amount,
            category,
            date,
        }),
    });

    closeModal("incomeModal");
    loadTransactions();
}

// ==========================
// ADD EXPENSE
// ==========================
async function addExpense() {
    const amount = Number(document.getElementById("expenseAmount")?.value);
    const category = document.getElementById("expenseCategory")?.value;
    const date = document.getElementById("expenseDate")?.value;

    await fetch("https://expense-tracker-rsur.onrender.com/api/transactions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            type: "expense",
            amount,
            category,
            date,
        }),
    });

    closeModal("expenseModal");
    loadTransactions();
}

// ==========================
// DELETE TRANSACTION (FIXED SINGLE VERSION)
// ==========================
async function deleteTransaction(id) {
    await fetch(`https://expense-tracker-rsur.onrender.comapi/transactions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });

    if (isTransactionsPage) loadTransactionsForFilters();
    if (isDashboard) loadTransactions();
}

// ==========================
// TRANSACTIONS PAGE TABLE
// ==========================
async function loadAllTransactionsPage() {
    try {
        const res = await fetch("https://expense-tracker-rsur.onrender.com/api/transactions", {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) return console.log(data.message);

        const tbody = document.getElementById("allTransactionsBody");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:2rem;">
                        No transactions found
                    </td>
                </tr>`;
            return;
        }

        data.forEach((t) => {
            const isIncome = t.type === "income";

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${new Date(t.date).toLocaleDateString("en-IN")}</td>
                <td>${t.category}</td>
                <td style="color:${isIncome ? "#00c896" : "#ff4f4f"}">
                    ${t.type}
                </td>
                <td>
                    ${isIncome ? "+" : "-"}₹${t.amount}
                </td>
                <td>
                    <button onclick="deleteTransaction('${t._id}')">
                        Delete
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });
    } catch (err) {
        console.log(err);
    }
}

// ==========================
// DASHBOARD UI
// ==========================
function refreshUI() {
    if (!isDashboard) return;

    const period = document.getElementById("periodFilter")?.value;
    const now = new Date();

    const filtered = transactions.filter((t) => {
        const d = new Date(t.date);

        if (period === "daily") return d.toDateString() === now.toDateString();

        if (period === "weekly") {
            const start = new Date();
            start.setDate(now.getDate() - 7);
            return d >= start;
        }

        if (period === "monthly") {
            return (
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
            );
        }

        return true;
    });

    const income = filtered
        .filter((t) => t.type === "income")
        .reduce((a, b) => a + b.amount, 0);

    const expense = filtered
        .filter((t) => t.type === "expense")
        .reduce((a, b) => a + b.amount, 0);

    const incomeEl = document.querySelector(".income-amount");
    const expenseEl = document.querySelector(".expense-amount");

    if (incomeEl) incomeEl.textContent = `₹${income.toLocaleString("en-IN")}`;
    if (expenseEl) expenseEl.textContent = `₹${expense.toLocaleString("en-IN")}`;

    updateTable(filtered);
    updateBreakdown(filtered, expense);
    updateHealth(income, expense);
    renderChart();
}

// ==========================
// TABLE
// ==========================
function updateTable(data) {
    const tbody =
        document.getElementById("allTransactionsBody") ||
        document.getElementById("transactionBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center;padding:2rem;">
                No transactions yet
            </td>
        </tr>`;
        return;
    }

    data.slice(0, 10).forEach((t) => {
        const row = document.createElement("tr");
        const isIncome = t.type === "income";

        row.innerHTML = `
            <td>${new Date(t.date).toLocaleDateString("en-IN")}</td>
            <td>${t.category}</td>
            <td style="color:${isIncome ? "#00c896" : "#ff4f4f"}">
                ${isIncome ? "+" : "-"}₹${t.amount}
            </td>
            <td>Success</td>
            <td>
                <button class="delete-icon-btn" onclick="deleteTransaction('${t._id}')" title="Delete">
    <i class="fas fa-trash-can"></i>
</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// ==========================
// BREAKDOWN
// ==========================
function updateBreakdown(data, totalExp) {
    const el = document.getElementById("breakdownTotal");
    if (el) el.textContent = `₹${totalExp.toLocaleString("en-IN")}`;
}

// ==========================
// HEALTH
// ==========================
function updateHealth(inc, exp) {
    const score = inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;

    const scoreEl = document.getElementById("healthScore");
    const fill = document.getElementById("scoreFill");
    const label = document.getElementById("healthLabel");

    if (scoreEl) scoreEl.textContent = score;
    if (fill) fill.style.width = score + "%";

    if (!label) return;

    if (score > 70) label.textContent = "Excellent";
    else if (score > 40) label.textContent = "Stable";
    else label.textContent = "Critical";
}

// ==========================
// CHART
// ==========================
function renderChart() {
    const canvas = document.getElementById("financeChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const months = Array(12).fill().map(() => ({ inc: 0, exp: 0 }));

    transactions.forEach((t) => {
        const m = new Date(t.date).getMonth();
        if (t.type === "income") months[m].inc += t.amount;
        else months[m].exp += t.amount;
    });

    if (financeChart) financeChart.destroy();

    financeChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            datasets: [
                {
                    label: "Income",
                    data: months.map(m => m.inc),
                    backgroundColor: "#00c896",
                },
                {
                    label: "Expenses",
                    data: months.map(m => m.exp),
                    backgroundColor: "#ff4f4f",
                },
            ],
        },
    });
}

// ==========================
// GREETING
// ==========================
function updateGreeting() {
    const el = document.getElementById("greetingText");
    if (!el) return;

    const hour = new Date().getHours();

    let g = "Good morning";
    if (hour >= 12 && hour < 17) g = "Good afternoon";
    else if (hour >= 17) g = "Good evening";

    el.innerHTML = `<span class="greeting-serif">${g.split(" ")[0]}</span> ${g.split(" ")[1]} ✦`;
}

// ==========================
// NAV
// ==========================
function goTo(page) {
    window.location.href = page;
}
function applyTxFilters() {
    let data = [...transactions];

    const type = document.getElementById("filterType")?.value || "all";
    const category = document.getElementById("filterCategory")?.value || "all";
    const sortBy = document.getElementById("sortBy")?.value || "latest";

    // FILTER TYPE
    if (type !== "all") {
        data = data.filter(t => t.type === type);
    }

    // FILTER CATEGORY
    if (category !== "all") {
        data = data.filter(t => t.category === category);
    }

    // SORTING
    if (sortBy === "latest") {
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (sortBy === "oldest") {
        data.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    if (sortBy === "high") {
        data.sort((a, b) => b.amount - a.amount);
    }

    if (sortBy === "low") {
        data.sort((a, b) => a.amount - b.amount);
    }

    // reuse your existing table renderer
    renderTransactionsPage(data);
}
async function loadTransactionsForFilters() {
    try {
        const res = await fetch("https://expense-tracker-rsur.onrender.com/api/transactions", {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        transactions = data;
        applyTxFilters();
    } catch (err) {
        console.error(err);
        alert("Failed to load transactions");
    }
}
function renderTransactionsPage(data) {
    const tbody = document.getElementById("allTransactionsBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:2rem;">
                    No transactions found
                </td>
            </tr>`;
        return;
    }

    data.forEach(t => {
        const isIncome = t.type === "income";

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${new Date(t.date).toLocaleDateString("en-IN")}</td>
            <td>${t.category}</td>
            <td style="color:${isIncome ? "#00c896" : "#ff4f4f"}">
                ${t.type}
            </td>
            <td>
                ${isIncome ? "+" : "-"}₹${t.amount}
            </td>
            <td>
                <button class="delete-icon-btn" onclick="deleteTransaction('${t._id}')" title="Delete">
    <i class="fas fa-trash-can"></i>
</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}
async function loadAnalytics() {
    const res = await fetch("https://expense-tracker-rsur.onrender.com/api/transactions", {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    transactions = data;

    renderMonthlyChart();
    renderPieChart();
    renderSavingsChart();
}
function renderMonthlyChart() {
    const ctx = document.getElementById("monthlyChart").getContext("2d");

    const months = Array(12).fill().map(() => ({ inc: 0, exp: 0 }));

    transactions.forEach(t => {
        const m = new Date(t.date).getMonth();
        if (t.type === "income") months[m].inc += t.amount;
        else months[m].exp += t.amount;
    });

    new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            datasets: [
                {
                    label: "Income",
                    data: months.map(m => m.inc),
                    backgroundColor: "#00c896"
                },
                {
                    label: "Expense",
                    data: months.map(m => m.exp),
                    backgroundColor: "#ff4f4f"
                }
            ]
        }
    });
}
function renderPieChart() {
    const ctx = document.getElementById("pieChart").getContext("2d");

    const categories = {};

    transactions.forEach(t => {
        if (t.type === "expense") {
            categories[t.category] = (categories[t.category] || 0) + t.amount;
        }
    });

    new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories)
            }]
        }
    });
}
function renderSavingsChart() {
    const ctx = document.getElementById("savingsChart").getContext("2d");

    const months = Array(12).fill(0);

    transactions.forEach(t => {
        const m = new Date(t.date).getMonth();

        if (t.type === "income") months[m] += t.amount;
        else months[m] -= t.amount;
    });

    new Chart(ctx, {
        type: "line",
        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            datasets: [{
                label: "Savings",
                data: months,
                borderColor: "#3b6ef6",
                fill: false
            }]
        }
    });
}
// ==========================
// BUDGET PAGE
// ==========================

const isBudgetPage =
    document.querySelector(".goal-card") !== null;

if (isBudgetPage) {
    loadBudgetData();
}

async function loadBudgetData() {

    try {

        const res = await fetch("https://expense-tracker-rsur.onrender.com/api/transactions", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message);
        }

        transactions = data;

        generateBudgetStats();

    } catch (err) {
        console.log(err);
    }
}

function generateBudgetStats() {
    // ======================
    // TOTALS
    // ======================

    const income = transactions
        .filter(t => t.type === "income")
        .reduce((a, b) => a + b.amount, 0);

    const expense = transactions
        .filter(t => t.type === "expense")
        .reduce((a, b) => a + b.amount, 0);

    const savings = income - expense;


    const percent = Math.min(
        Math.round((savings / savingsGoal) * 100),
        100
    );

    const goalAmount = document.querySelector(".goal-top h2");
    const goalPercent = document.querySelector(".goal-percent");
    const goalFill = document.querySelector(".goal-progress-fill");
    const goalNote = document.querySelector(".goal-note");

    if (goalAmount) {
        goalAmount.textContent =
            `₹${savings.toLocaleString("en-IN")} / ₹${savingsGoal.toLocaleString("en-IN")}`;
    }

    if (goalPercent) {
        goalPercent.textContent = `${percent}%`;
    }

    if (goalFill) {
        goalFill.style.width = `${percent}%`;
    }

    if (goalNote) {

        const remaining = savingsGoal - savings;

        if (remaining > 0) {
            goalNote.textContent =
                `₹${remaining.toLocaleString("en-IN")} remaining to reach your monthly target`;
        } else {
            goalNote.textContent =
                `Goal achieved successfully ✦`;
        }
    }

    // ======================
    // CATEGORY ANALYSIS
    // ======================

    const expenseTx = transactions.filter(
        t => t.type === "expense"
    );

    const categoryTotals = {};

    expenseTx.forEach(t => {

        if (!categoryTotals[t.category]) {
            categoryTotals[t.category] = 0;
        }

        categoryTotals[t.category] += t.amount;
    });

    // highest category

    let highestCategory = "";
    let highestAmount = 0;

    Object.entries(categoryTotals).forEach(([cat, amt]) => {

        if (amt > highestAmount) {
            highestAmount = amt;
            highestCategory = cat;
        }
    });

    // ======================
    // INSIGHTS
    // ======================

    const insightCards =
        document.querySelectorAll(".insight-card");

    if (insightCards[0]) {
        insightCards[0].querySelector("p").textContent =
            `You saved ₹${savings.toLocaleString("en-IN")} this month.`;
    }

    if (insightCards[1]) {
        insightCards[1].querySelector("p").textContent =
            `${highestCategory} is your most expensive category currently.`;
    }

    if (insightCards[2]) {

        const avgExpense =
            expenseTx.length > 0
                ? Math.round(expense / expenseTx.length)
                : 0;

        insightCards[2].querySelector("p").textContent =
            `Your average expense transaction is ₹${avgExpense.toLocaleString("en-IN")}.`;
    }

    // ======================
    // ALERTS
    // ======================

    const alertCards =
        document.querySelectorAll(".alert-card");

    if (alertCards[0]) {

        if (expense > income) {

            alertCards[0].querySelector("h4").textContent =
                "Overspending Alert";

            alertCards[0].querySelector("p").textContent =
                "Your expenses exceeded income this month.";
        }
        else {

            alertCards[0].querySelector("h4").textContent =
                "Healthy Spending";

            alertCards[0].querySelector("p").textContent =
                "Your spending is currently under control.";
        }
    }

    if (alertCards[1]) {

        alertCards[1].querySelector("p").textContent =
            `${highestCategory} spending is significantly high this month.`;
    }

    if (alertCards[2]) {

        if (percent >= 100) {

            alertCards[2].querySelector("h4").textContent =
                "Savings Goal Achieved";

            alertCards[2].querySelector("p").textContent =
                "Excellent financial discipline this month.";
        }
        else {

            alertCards[2].querySelector("h4").textContent =
                "Savings Goal In Progress";

            alertCards[2].querySelector("p").textContent =
                `${percent}% of your savings target completed.`;
        }
    }
}
async function fetchSavingsGoal() {
    try {
        const res = await fetch("https://expense-tracker-rsur.onrender.com/api/auth/goal", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await res.json();

        savingsGoal = data.goal || 20000; // fallback
    } catch (err) {
        console.log("Goal fetch error:", err);
        savingsGoal = 20000; // fallback
    }
}
function updateGoalUI() {

    const income = transactions
        .filter(t => t.type === "income")
        .reduce((a, b) => a + b.amount, 0);

    const expense = transactions
        .filter(t => t.type === "expense")
        .reduce((a, b) => a + b.amount, 0);

    const savings = income - expense;

    const percent = savingsGoal
        ? Math.min(Math.round((savings / savingsGoal) * 100), 100)
        : 0;

    const goalAmount = document.querySelector(".goal-top h2");
    const goalPercent = document.querySelector(".goal-percent");
    const goalFill = document.querySelector(".goal-progress-fill");
    const goalNote = document.querySelector(".goal-note");

    if (goalAmount) {
        goalAmount.textContent =
            `₹${savings.toLocaleString("en-IN")} / ₹${savingsGoal.toLocaleString("en-IN")}`;
    }

    if (goalPercent) {
        goalPercent.textContent = `${percent}%`;
    }

    if (goalFill) {
        goalFill.style.width = `${percent}%`;
    }

    if (goalNote) {
        const remaining = savingsGoal - savings;

        goalNote.textContent =
            remaining > 0
                ? `₹${remaining.toLocaleString("en-IN")} remaining`
                : "Goal achieved ✦";
    }
}
async function saveGoal() {
    const input = document.getElementById("goalInput");
    if (!input) return;

    const goal = Number(input.value);

    if (!goal || goal <= 0) {
        alert("Enter a valid goal");
        return;
    }

    try {
        const res = await fetch("https://expense-tracker-rsur.onrender.com/api/auth/goal", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ goal }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to update goal");
        }

        savingsGoal = data.goal;

        updateGoalUI();

        alert("Goal updated successfully ✔");

    } catch (err) {
        console.error(err);
        alert("Failed to update goal");
    }
}
