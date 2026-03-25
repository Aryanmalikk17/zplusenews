import express from 'express';
const router = express.Router();
import newsController from '../controllers/newsController.js';

router.get('/', newsController.getAllNews);
router.get('/:id', newsController.getNewsById);
router.post('/', newsController.createNews);
router.put('/:id', newsController.updateNews);
router.delete('/:id', newsController.deleteNews);

export default router;
