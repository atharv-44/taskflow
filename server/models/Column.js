const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Column name is required'],
      trim: true,
    },
    // Fractional ordering — never reindex all siblings on drag
    order: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Index for fast sorted fetches within a board
columnSchema.index({ board: 1, order: 1 });

module.exports = mongoose.model('Column', columnSchema);
