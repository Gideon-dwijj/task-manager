console.log("🚀 Starting Task Manager Server...");

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// MongoDB Connection
mongoose.connect(
  "mongodb://joygideonankamreddy_db_user:aNebWXCCrSz5yzwM@ac-zzeoptx-shard-00-00.sigynjg.mongodb.net:27017,ac-zzeoptx-shard-00-01.sigynjg.mongodb.net:27017,ac-zzeoptx-shard-00-02.sigynjg.mongodb.net:27017/taskdb?ssl=true&replicaSet=atlas-iy2smx-shard-0&authSource=admin&retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => console.log("❌ MongoDB connection error:", err.message));

// Models
const User = require("./models/User");
const Task = require("./models/Task");

// JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ================= ROOT =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================= AUTH =================

// Register
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !email.match(/^[^\s@]+@gmail\.com$/))
      return res.status(400).json({ error: "Email must be a valid @gmail.com address" });

    if (!password || password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters long" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already registered" });

    const user = new User({
      email,
      password,
      name: name || email.split("@")[0]
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });

  } catch (err) {
    console.log("Register error:", err);
    res.status(500).json({ error: "Error registering user" });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    const valid = await user.comparePassword(password);
    if (!valid)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });

  } catch (err) {
    console.log("Login error:", err);
    res.status(500).json({ error: "Error logging in" });
  }
});

// ================= TASKS =================

app.get("/tasks", verifyToken, async (req, res) => {
  const tasks = await Task.find({ user: req.userId });
  res.json(tasks);
});

app.post("/add", verifyToken, async (req, res) => {
  const task = new Task({ ...req.body, user: req.userId });
  await task.save();
  res.json(task);
});

app.put("/update/:id", verifyToken, async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(task);
});

app.delete("/delete/:id", verifyToken, async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// ================= START SERVER =================

const PORT = process.env.PORT || 3000;

// ✅ IMPORTANT FIX (PUBLIC ACCESS)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});