import mongoose from 'mongoose'

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  marks: { type: String, required: true }, // e.g., "A+", "B", "ABSENT"
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false })

export default mongoose.models.Marks || mongoose.model('Marks', marksSchema)