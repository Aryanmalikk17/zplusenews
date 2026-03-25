import mongoose from 'mongoose';

const InterviewSchema = new mongoose.Schema({
    intervieweeName: { type: String, required: true },
    designation: String,
    company: String,
    title: { type: String, required: true },
    image: String,
    summary: String,
    content: String,
    videoUrl: String,
    publishedAt: { type: Date, default: Date.now }
});

const Interview = mongoose.model('Interview', InterviewSchema);
export default Interview;
