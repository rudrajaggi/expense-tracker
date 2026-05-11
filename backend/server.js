const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const transactionRoutes = require("./routes/transaction");

const app = express();

// ======================
// middleware
// ======================
app.use(cors());
app.use(express.json());

// ======================
// database
// ======================
connectDB().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
    });
});

// ======================
// API routes
// ======================
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

// ======================
// serve frontend
// ======================
app.use(express.static(path.join(__dirname, "../frontend")));

// homepage → index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ======================
// start server
// ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});