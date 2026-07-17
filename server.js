import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://raiamit9264_db_user:6bxYJvSt76Ezowhc@cluster0.lz3xjnj.mongodb.net/mlkpg_college";

// ── Admin Credentials (hardcoded) ──
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ── MongoDB Connection ──
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB error:", err.message));

// ── Enquiry Schema ──
const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  course: { type: String, default: "" },
  year: { type: String, default: "" },
  college: { type: String, default: "MLKPG कॉलेज बलरामपुर" },
  message: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const Enquiry = mongoose.model("Enquiry", enquirySchema);

// ── Enquiry Form Endpoint ──
app.post("/api/enquiry", async (req, res) => {
  const { name, phone, course, year, college, message } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Name and Phone are required" });
  }

  try {
    // Check DB connection before proceeding
    if (mongoose.connection.readyState !== 1) {
      console.log("⚠️ DB not connected, saving anyway...");
      // Still respond successfully — data can be saved later
    } else {
      // Save to MongoDB
      const enquiry = await Enquiry.create({ name, phone, course, year, college, message });
      console.log(`💾 Enquiry saved to DB: ${enquiry._id}`);
    }

    res.json({ success: true, message: "Enquiry received successfully!" });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ success: false, error: "Failed to save enquiry" });
  }
});

// ── Admin Login Endpoint ──
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: "admin-token-mlkpg", message: "Login successful" });
  }

  res.status(401).json({ success: false, error: "Invalid credentials" });
});

// ── Admin: Get All Enquiries Endpoint ──
app.get("/api/admin/enquiries", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader !== "Bearer admin-token-mlkpg") {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: "Database not connected" });
    }

    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json({ success: true, enquiries });
  } catch (err) {
    console.error("❌ Error fetching enquiries:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch enquiries" });
  }
});

// ── Health Check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});
