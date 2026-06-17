const express = require('express');
const { getNews } = require('../services/newsService');

const router = express.Router();

// GET /api/news?limit=20
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const articles = await getNews(limit);
    res.json({
      articles,
      count: articles.length,
    });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ error: 'Failed to fetch market news' });
  }
});

module.exports = router;
