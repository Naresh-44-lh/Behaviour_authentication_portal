import mongoose from 'mongoose'

const userMetricSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },
  typing_speed: { type: Number, default: 0 },
  mouse_movements: { type: Number, default: 0 },
  recorded_at: { type: Date, default: Date.now }
}, { timestamps: false })

export default mongoose.models.UserMetric || mongoose.model('UserMetric', userMetricSchema)
