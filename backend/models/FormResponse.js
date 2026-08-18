const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true },
    label: { type: String, default: '' },
    value: { type: mongoose.Schema.Types.Mixed, default: '' },
  },
  { _id: false }
);

const formResponseSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SurveyForm',
      required: true,
      index: true,
    },
    answers: { type: [answerSchema], default: [] },
    respondentEmail: { type: String, default: '', trim: true, lowercase: true, maxlength: 200 },
    respondentName: { type: String, default: '', trim: true, maxlength: 120 },
    ipAddress: { type: String, default: '', trim: true, maxlength: 80 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

formResponseSchema.index({ form: 1, submittedAt: -1 });
formResponseSchema.index({ form: 1, respondentEmail: 1 });

module.exports = mongoose.model('FormResponse', formResponseSchema);
