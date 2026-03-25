import News from '../models/News.js';

const getAllNews = async (req, res) => {
    try {
        const news = await News.find().sort({ publishedAt: -1 });
        res.json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getNewsById = async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) return res.status(404).json({ message: 'News not found' });
        res.json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createNews = async (req, res) => {
    const news = new News(req.body);
    try {
        const newNews = await news.save();
        res.status(201).json(newNews);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateNews = async (req, res) => {
    try {
        const news = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(news);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteNews = async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.json({ message: 'News deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export default {
    getAllNews,
    getNewsById,
    createNews,
    updateNews,
    deleteNews
};
