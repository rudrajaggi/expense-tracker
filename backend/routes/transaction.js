const express = require("express");
const router = express.Router();

const Transaction = require("../models/Transactions");
const authMiddleware = require("../middleware/authMiddleware");


// ======================
// ADD TRANSACTION
// ======================
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { type, amount, category, date } = req.body;

        if (!type || !amount || !category) {
            return res.status(400).json({ message: "All fields required" });
        }

        const newTransaction = new Transaction({
            userId: req.user.id,
            type,
            amount,
            category,
            date: date || Date.now()
        });

        await newTransaction.save();

        res.status(201).json(newTransaction);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// ======================
// GET ALL TRANSACTIONS (USER ONLY)
// ======================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// ======================
// DELETE TRANSACTION
// ======================
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        await Transaction.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        res.json({ message: "Transaction deleted" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ======================
// UPDATE TRANSACTION
// ======================
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { type, amount, category, date } = req.body;

        const updated = await Transaction.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user.id
            },
            { type, amount, category, date },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json(updated);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;