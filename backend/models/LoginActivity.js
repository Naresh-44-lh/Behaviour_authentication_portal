import mongoose from 'mongoose'

const loginActivitySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },
  login_time: { type: Date, default: Date.now },
  location: { type: String, default: null },
  ip_address: { type: String, default: null },
  device: { type: String, default: null }
}, { timestamps: false })

export default mongoose.models.LoginActivity || mongoose.model('LoginActivity', loginActivitySchema)
