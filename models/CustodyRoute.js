const mongoose = require('mongoose');

const CustodyRouteSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  evidenceId: { type: Number, required: true },
  from: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  to: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  route: [
    {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.CustodyRoute || mongoose.model('CustodyRoute', CustodyRouteSchema);
