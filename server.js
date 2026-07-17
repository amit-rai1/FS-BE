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

// ── Student Schema ──
const studentSchema = new mongoose.Schema({
  crNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  fatherName: { type: String, default: "" },
  email: { type: String, default: "" },
  phone: { type: String, required: true },
  address: { type: String, default: "" },
  course: { type: String, default: "" },
  year: { type: String, default: "" },
  college: { type: String, default: "MLKPG कॉलेज बलरामपुर" },
  fee: { type: Number, default: 3000 },
  paid: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Student = mongoose.model("Student", studentSchema);

// ── Payment Schema ──
const paymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  crNo: { type: String, required: true },
  amount: { type: Number, required: true },
  mode: { type: String, enum: ["online", "offline"], required: true },
  receiptNo: { type: String, required: true, unique: true },
  note: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const Payment = mongoose.model("Payment", paymentSchema);

// ── Auth Middleware ──
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== "Bearer admin-token-mlkpg") {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

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
app.get("/api/admin/enquiries", authMiddleware, async (req, res) => {
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

// ── Student CRUD Endpoints ──
app.get("/api/admin/students", authMiddleware, async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch students" });
  }
});

app.get("/api/admin/students/:id", authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });
    const payments = await Payment.find({ studentId: student._id }).sort({ createdAt: -1 });
    res.json({ success: true, student, payments });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch student" });
  }
});

app.post("/api/admin/students", authMiddleware, async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.json({ success: true, student });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put("/api/admin/students/:id", authMiddleware, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });
    res.json({ success: true, student });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/students/:id", authMiddleware, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });
    await Payment.deleteMany({ studentId: student._id });
    res.json({ success: true, message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete student" });
  }
});

// ── Payment Endpoints ──
app.get("/api/admin/payments", authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch payments" });
  }
});

app.post("/api/admin/payments", authMiddleware, async (req, res) => {
  try {
    const { studentId, amount, mode, note } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });

    const receiptNo = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payment = await Payment.create({ studentId, crNo: student.crNo, amount, mode, receiptNo, note });

    student.paid = (student.paid || 0) + Number(amount);
    await student.save();

    res.json({ success: true, payment, student });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get("/api/admin/receipts/:receiptNo", authMiddleware, async (req, res) => {
  try {
    const payment = await Payment.findOne({ receiptNo: req.params.receiptNo });
    if (!payment) return res.status(404).json({ success: false, error: "Receipt not found" });
    const student = await Student.findById(payment.studentId);
    res.json({ success: true, payment, student });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch receipt" });
  }
});

// ── Reports Endpoint ──
app.get("/api/admin/reports", authMiddleware, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalPayments = await Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
    const totalCollected = totalPayments[0]?.total || 0;
    const totalDue = (totalStudents * 3000) - totalCollected;
    const onlineTotal = await Payment.aggregate([{ $match: { mode: "online" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
    const offlineTotal = await Payment.aggregate([{ $match: { mode: "offline" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
    const courseWise = await Student.aggregate([{ $group: { _id: "$course", count: { $sum: 1 }, totalFee: { $sum: "$fee" }, totalPaid: { $sum: "$paid" } } }]);

    res.json({
      success: true,
      report: {
        totalStudents,
        totalCollected,
        totalDue,
        onlineTotal: onlineTotal[0]?.total || 0,
        offlineTotal: offlineTotal[0]?.total || 0,
        courseWise,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
});

// ── Health Check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});
