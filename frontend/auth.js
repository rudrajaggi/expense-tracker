// ==========================
// SIGNUP
// ==========================
async function signup() {
    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.message);
        return;
    }

    alert("Signup successful! Please login.");
    window.location.href = "login.html";
}

// ==========================
// LOGIN
// ==========================
async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.message);
        return;
    }

    // 🔥 THIS IS CRITICAL
    localStorage.setItem("token", data.token);

    console.log("TOKEN SAVED:", data.token);

    window.location.href = "index.html";
}