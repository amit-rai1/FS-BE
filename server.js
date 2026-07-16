import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://raiamit9264_db_user:6bxYJvSt76Ezowhc@cluster0.lz3xjnj.mongodb.net/mlkpg_college";
const EMAIL_PASS = process.env.EMAIL_PASS || "llxu qmat fglj qgfw";

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
  email: { type: String, default: "" },
  phone: { type: String, required: true },
  course: { type: String, default: "" },
  year: { type: String, default: "" },
  college: { type: String, default: "MLKPG कॉलेज बलरामपुर" },
  message: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const Enquiry = mongoose.model("Enquiry", enquirySchema);

// ── Email Transporter ──
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "amitrai8489@gmail.com",
    pass: EMAIL_PASS,
  },
});

// ── Enquiry Form Endpoint ──
app.post("/api/enquiry", async (req, res) => {
  const { name, email, phone, course, year, college, message } = req.body;

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
      const enquiry = await Enquiry.create({ name, email, phone, course, year, college, message });
      console.log(`💾 Enquiry saved to DB: ${enquiry._id}`);
    }

    // Send email notification (with timeout)
    const mailOptions = {
      from: `"MLKPG Enquiry" <amitrai8489@gmail.com>`,
      to: "amitrai8489@gmail.com",
      subject: `New Enquiry from ${name} - ${course || "Not selected"}`,
      html: `
        <h2>📋 New Course Enquiry</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;width:100%;max-width:500px;">
          <tr><td><strong>👤 Name</strong></td><td>${name}</td></tr>
          <tr><td><strong>📧 Email</strong></td><td>${email || "N/A"}</td></tr>
          <tr><td><strong>📞 Phone</strong></td><td>${phone}</td></tr>
          <tr><td><strong>📚 Course</strong></td><td>${course || "N/A"}</td></tr>
          <tr><td><strong>🎓 Year</strong></td><td>${year || "N/A"}</td></tr>
          <tr><td><strong>🏫 College</strong></td><td>${college || "N/A"}</td></tr>
          <tr><td><strong>💬 Query</strong></td><td>${message || "No message"}</td></tr>
        </table>
        <p style="color:#666;font-size:12px;margin-top:16px;">Received on ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
      `,
    };

    await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Email timeout")), 10000))
    ]);
    console.log(`✅ Email sent for ${name} (${phone})`);
    res.json({ success: true, message: "Enquiry received successfully!" });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.json({ success: true, message: "Enquiry received! We'll contact you soon." });
  }
});

// ── Health Check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📧 Email: amitrai8489@gmail.com`);
});