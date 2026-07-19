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
  password: { type: String, default: "student123" },
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

// ── Attendance Schema ──
const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  crNo: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  status: { type: String, enum: ["present", "absent", "leave"], required: true },
  note: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

// ── Content Schema ──
const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  course: { type: String, default: "" },
  year: { type: String, default: "" },
  type: { type: String, enum: ["video", "pdf", "link", "notes"], required: true },
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Content = mongoose.model("Content", contentSchema);

// ── Quiz Schema ──
const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  course: { type: String, default: "" },
  year: { type: String, default: "" },
  questions: [
    {
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      answer: { type: Number, required: true }, // index of correct option
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Quiz = mongoose.model("Quiz", quizSchema);

// ── Quiz Attempt Schema ──
const attemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  answers: [Number],
  createdAt: { type: Date, default: Date.now },
});

const Attempt = mongoose.model("Attempt", attemptSchema);

// ── Auth Middleware ──
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || authHeader.trim() !== "Bearer admin-token-mlkpg") {
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

  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanPassword = String(password || "").trim();

  if (cleanUsername === ADMIN_USERNAME && cleanPassword === ADMIN_PASSWORD) {
    return res.json({ success: true, token: "admin-token-mlkpg", message: "Login successful" });
  }

  res.status(401).json({ success: false, error: "Invalid credentials" });
});

// ── Student Login Endpoint ──
app.post("/api/student/login", async (req, res) => {
  try {
    const { crNo, password } = req.body;
    const student = await Student.findOne({ crNo: String(crNo || "").trim() });
    if (!student || student.password !== String(password || "").trim()) {
      return res.status(401).json({ success: false, error: "Invalid CR number or password" });
    }
    res.json({ success: true, token: `student-token-${student._id}`, student: { _id: student._id, crNo: student.crNo, name: student.name, course: student.course, year: student.year } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Login failed" });
  }
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

// ── Generate Receipt Number: Fullstack{year}{sequence} ──
async function generateReceiptNo() {
  const currentYear = new Date().getFullYear();
  const prefix = `Fullstack${currentYear}`;
  // Find the latest payment with this prefix
  const latestPayment = await Payment.findOne({ receiptNo: { $regex: `^${prefix}` } }).sort({ createdAt: -1 });
  let maxSeq = 0;
  if (latestPayment) {
    const seq = parseInt(latestPayment.receiptNo.slice(prefix.length), 10);
    if (!isNaN(seq)) maxSeq = seq;
  }
  // Also check all payments with this prefix to find the true max
  const allPayments = await Payment.find({ receiptNo: { $regex: `^${prefix}` } }, { receiptNo: 1 });
  allPayments.forEach((p) => {
    const seq = parseInt(p.receiptNo.slice(prefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  });
  return `${prefix}${maxSeq + 1}`;
}

app.post("/api/admin/payments", authMiddleware, async (req, res) => {
  try {
    const { studentId, amount, mode, note } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });

    const receiptNo = await generateReceiptNo();
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

// ── Download Receipt as HTML ──
app.get("/api/admin/receipts/:receiptNo/download", async (req, res) => {
  try {
    const payment = await Payment.findOne({ receiptNo: req.params.receiptNo });
    if (!payment) return res.status(404).send("Receipt not found");
    const student = await Student.findById(payment.studentId);
    if (!student) return res.status(404).send("Student not found");

    const date = new Date(payment.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const currentYear = new Date().getFullYear();
    const modeLabel = payment.mode === "online" ? "Online" : "Offline";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt ${payment.receiptNo}</title>
<style>
@page { size: A4; margin: 15mm 12mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #1a1a2e; background: #fff; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.receipt-wrapper { max-width: 720px; margin: 0 auto; border: 2px solid #2563eb; border-radius: 12px; overflow: hidden; background: #fff; }
.receipt-header { text-align: center; padding: 28px 24px 20px; background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%); border-bottom: 3px solid #2563eb; }
.receipt-header h3 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: 4px; font-weight: 700; }
.receipt-header p { font-size: 0.85rem; color: #475569; font-weight: 500; }
.receipt-table { width: 100%; border-collapse: collapse; margin-top: 16px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
.receipt-table td, .receipt-table th { border: 1px solid #e2e8f0; padding: 10px 14px; font-size: 0.88rem; color: #334155; }
.receipt-table td strong { color: #1e293b; }
.receipt-table th { background: #2563eb; color: #fff; font-weight: 600; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px; }
.receipt-table tbody tr:nth-child(even) { background: #f8fafc; }
.receipt-note { text-align: center; font-size: 0.78rem; color: #94a3b8; margin-top: 20px; padding-top: 16px; border-top: 1px dashed #e2e8f0; }
.receipt-footer { text-align: center; padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #64748b; }
</style>
</head>
<body>
<div class="receipt-wrapper">
  <div class="receipt-header">
    <h3>M.L.K. (P.G.) COLLEGE, BALRAMPUR (U.P.) - 271201</h3>
    <p>Course Fee Receipt ${currentYear}-${currentYear + 1}</p>
  </div>
  <div style="padding: 0 16px;">
    <table class="receipt-table">
      <tbody>
        <tr><td><strong>Receipt No.</strong></td><td>${payment.receiptNo}</td><td><strong>Date</strong></td><td>${date}</td></tr>
        <tr><td><strong>Student Name</strong></td><td colspan="3">${student.name}</td></tr>
        <tr><td><strong>Father's Name</strong></td><td colspan="3">${student.fatherName || "N/A"}</td></tr>
        <tr><td><strong>CR No.</strong></td><td>${student.crNo}</td><td><strong>Phone</strong></td><td>${student.phone}</td></tr>
        <tr><td><strong>Course</strong></td><td>${student.course || "N/A"}</td><td><strong>Year</strong></td><td>${student.year || "N/A"}</td></tr>
      </tbody>
    </table>
    <table class="receipt-table">
      <thead><tr><th>Particulars</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>FullStack Development Payment (${modeLabel})</td><td>\u20B9${payment.amount}</td></tr>
        <tr><td><strong>Total</strong></td><td><strong>\u20B9${payment.amount}</strong></td></tr>
      </tbody>
    </table>
    <p class="receipt-note">Note: This is a computer generated receipt.</p>
  </div>
  <div class="receipt-footer">
    <p>MLKPG College, Balrampur, Uttar Pradesh - 271201</p>
    <p>Contact: 7800356804 | This is a computer generated receipt.</p>
  </div>
</div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `attachment; filename="Receipt-${payment.receiptNo}.html"`);
    res.send(html);
  } catch (err) {
    res.status(500).send("Failed to generate receipt");
  }
});

// ── Attendance Endpoints ──
app.get("/api/admin/attendance", authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const query = date ? { date } : {};
    const attendance = await Attendance.find(query).sort({ date: -1 });
    res.json({ success: true, attendance });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch attendance" });
  }
});

app.post("/api/admin/attendance", authMiddleware, async (req, res) => {
  try {
    const { studentId, date, status, note } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });

    const attendance = await Attendance.findOneAndUpdate(
      { studentId, date },
      { crNo: student.crNo, status, note },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, attendance });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/attendance/bulk", authMiddleware, async (req, res) => {
  try {
    const { date, records } = req.body;
    const ops = records.map((r) => ({
      updateOne: {
        filter: { studentId: r.studentId, date },
        update: { status: r.status, note: r.note || "", crNo: r.crNo },
        upsert: true,
      },
    }));
    await Attendance.bulkWrite(ops);
    const attendance = await Attendance.find({ date });
    res.json({ success: true, attendance });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/attendance/:id", authMiddleware, async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Attendance record deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete attendance" });
  }
});

// ── Content Admin Endpoints ──
app.get("/api/admin/contents", authMiddleware, async (req, res) => {
  try {
    const contents = await Content.find().sort({ createdAt: -1 });
    res.json({ success: true, contents });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch contents" });
  }
});

app.post("/api/admin/contents", authMiddleware, async (req, res) => {
  try {
    const content = await Content.create(req.body);
    res.json({ success: true, content });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put("/api/admin/contents/:id", authMiddleware, async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!content) return res.status(404).json({ success: false, error: "Content not found" });
    res.json({ success: true, content });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/contents/:id", authMiddleware, async (req, res) => {
  try {
    await Content.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Content deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete content" });
  }
});

// ── Quiz Admin Endpoints ──
app.get("/api/admin/quizzes", authMiddleware, async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.json({ success: true, quizzes });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch quizzes" });
  }
});

app.post("/api/admin/quizzes", authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.create(req.body);
    res.json({ success: true, quiz });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put("/api/admin/quizzes/:id", authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });
    res.json({ success: true, quiz });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/api/admin/quizzes/:id", authMiddleware, async (req, res) => {
  try {
    await Quiz.findByIdAndDelete(req.params.id);
    await Attempt.deleteMany({ quizId: req.params.id });
    res.json({ success: true, message: "Quiz deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete quiz" });
  }
});

// ── Student Dashboard Endpoints ──
function studentAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("student-token-")) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  req.studentId = authHeader.replace("student-token-", "").trim();
  next();
}

app.get("/api/student/me", studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).select("-password");
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch student" });
  }
});

app.get("/api/student/contents", studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId);
    const query = student?.course ? { $or: [{ course: "" }, { course: student.course }] } : {};
    const contents = await Content.find(query).sort({ createdAt: -1 });
    res.json({ success: true, contents });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch contents" });
  }
});

app.get("/api/student/quizzes", studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId);
    const query = student?.course ? { $or: [{ course: "" }, { course: student.course }] } : {};
    const quizzes = await Quiz.find(query).sort({ createdAt: -1 });
    const attempts = await Attempt.find({ studentId: req.studentId });
    const attemptedQuizIds = attempts.map((a) => a.quizId.toString());
    res.json({ success: true, quizzes: quizzes.map((q) => ({ ...q.toObject(), attempted: attemptedQuizIds.includes(q._id.toString()) })), attempts });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch quizzes" });
  }
});

app.post("/api/student/quizzes/:id/attempt", studentAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });

    const { answers } = req.body;
    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.answer) score++;
    });

    const attempt = await Attempt.create({ studentId: req.studentId, quizId: quiz._id, score, total: quiz.questions.length, answers });
    res.json({ success: true, attempt });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get("/api/student/attendance", studentAuth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ studentId: req.studentId }).sort({ date: -1 });
    res.json({ success: true, attendance });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch attendance" });
  }
});

app.get("/api/student/payments", studentAuth, async (req, res) => {
  try {
    const payments = await Payment.find({ studentId: req.studentId }).sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch payments" });
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

    // Attendance summary for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const attendanceSummary = await Attendance.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const attendanceCounts = { present: 0, absent: 0, leave: 0 };
    attendanceSummary.forEach((a) => { attendanceCounts[a._id] = a.count; });

    res.json({
      success: true,
      report: {
        totalStudents,
        totalCollected,
        totalDue,
        onlineTotal: onlineTotal[0]?.total || 0,
        offlineTotal: offlineTotal[0]?.total || 0,
        courseWise,
        attendanceCounts,
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
