import dbConnect from '@/utils/dbConnect';
import mongoose from 'mongoose';

const CaseSchema = new mongoose.Schema({
    courtId: String,
    caseId: Number,
    caseDescription: String,
    caseType: String,
    petitioner: String,
    respondent: String,
    startDateTime: String, // Changed from Number to String
    status: String,
    submittedBy: String,
    totalEvidences: Number,
}, { timestamps: true });

export default mongoose.models.Case || mongoose.model('Case', CaseSchema);
