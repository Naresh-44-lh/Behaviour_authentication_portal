import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: false },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','faculty','student','user'], default: 'student' },
  is_blocked: { type: Boolean, default: false },
  failed_attempts: { type: Number, default: 0 },
  is_temporary: { type: Boolean, default: false },
  expires_at: { type: Date, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

export default mongoose.models.User || mongoose.model('User', userSchema)
