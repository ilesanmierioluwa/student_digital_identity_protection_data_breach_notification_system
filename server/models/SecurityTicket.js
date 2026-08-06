const mongoose = require('mongoose');

const securityTicketSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'in_review', 'closed'], default: 'open', index: true },
    adminNotes: { type: String, default: '' },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SecurityTicket', securityTicketSchema);
