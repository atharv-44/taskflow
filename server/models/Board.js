const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Board name is required'],
      trim: true,
      default: 'Main Board',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true, // 1:1 with project
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Board', boardSchema);
