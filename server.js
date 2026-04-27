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

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ==================== ROOT ROUTES ==================== //

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==================== AUTHENTICATION ROUTES ==================== //

// Register
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate email format (must be @gmail.com)
    if (!email || !email.match(/^[^\s@]+@gmail\.com$/)) {
      return res.status(400).json({ error: "Email must be a valid @gmail.com address" });
    }

    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name: name || email.split("@")[0]
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      message: "User registered successfully",
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.log("Registration error:", err);
    res.status(500).json({ error: "Error registering user" });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.log("Login error:", err);
    res.status(500).json({ error: "Error logging in" });
  }
});

// ==================== TASK ROUTES ==================== //

// Get all tasks (only for logged-in user, not completed)
app.get("/tasks", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({
      user: req.userId,
      status: { $in: ["pending", "in-progress"] }
    }).sort({ priority: 1, dueDate: 1, createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Error fetching tasks" });
  }
});

// Get completed tasks
app.get("/tasks/completed", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({
      user: req.userId,
      status: "completed"
    }).sort({ updatedAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Error fetching completed tasks" });
  }
});

// Create task
app.post("/add", verifyToken, async (req, res) => {
  try {
    const { title, description, priority, dueDate, category } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const task = new Task({
      user: req.userId,
      title,
      description: description || "",
      priority: priority || "medium",
      dueDate: dueDate || null,
      category: category || "General"
    });

    await task.save();
    res.json({ success: true, message: "Task added successfully", task });
  } catch (err) {
    console.log("Error adding task:", err);
    res.status(500).json({ error: "Error adding task" });
  }
});

// Update task
app.put("/update/:id", verifyToken, async (req, res) => {
  try {
    const { title, description, priority, dueDate, category, status } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      {
        title,
        description,
        priority,
        dueDate,
        category,
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ success: true, message: "Task updated", task });
  } catch (err) {
    res.status(500).json({ error: "Error updating task" });
  }
});

// Complete task (mark as completed)
app.put("/complete/:id", verifyToken, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { status: "completed", completed: true, updatedAt: new Date() },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ success: true, message: "Task completed" });
  } catch (err) {
    res.status(500).json({ error: "Error completing task" });
  }
});

// Delete task
app.delete("/delete/:id", verifyToken, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting task" });
  }
});

// Get statistics
app.get("/stats", verifyToken, async (req, res) => {
  try {
    const totalTasks = await Task.countDocuments({ user: req.userId });
    const completedTasks = await Task.countDocuments({ user: req.userId, status: "completed" });
    const pendingTasks = await Task.countDocuments({ user: req.userId, status: { $in: ["pending", "in-progress"] } });

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching statistics" });
  }
});

// ==================== START SERVER ==================== //

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Error handling
server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});