import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalDays: { type: Number, required: true },
  presentDays: { type: Number, required: true },
  absentDays: { type: Number, default: function() { return this.totalDays - this.presentDays } },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false })

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema)