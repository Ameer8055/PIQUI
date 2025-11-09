const express = require('express');
const router = express.Router();
const Note = require('../Models/Note');
const { auth } = require('../Middlewares/authMiddleware');

// Get all notes for a user
router.get('/', auth, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    
    let query = { createdBy: req.user._id };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const notes = await Note.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Note.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        notes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get public notes
router.get('/public', async (req, res) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    
    let query = { isPublic: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }

    const notes = await Note.find(query)
      .populate('createdBy', 'name')
      .sort({ downloads: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Note.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        notes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get note by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user._id },
        { isPublic: true }
      ]
    }).populate('createdBy', 'name');

    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }

    res.json({ status: 'success', data: note });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Create new note
router.post('/', auth, async (req, res) => {
  try {
    const note = new Note({
      ...req.body,
      createdBy: req.user._id
    });

    await note.save();
    res.status(201).json({ status: 'success', data: note });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Update note
router.put('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }

    res.json({ status: 'success', data: note });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Delete note
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }

    res.json({ status: 'success', message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Like/unlike note
router.post('/:id/like', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }

    const hasLiked = note.likes.includes(req.user._id);
    
    if (hasLiked) {
      // Unlike
      note.likes = note.likes.filter(like => !like.equals(req.user._id));
    } else {
      // Like
      note.likes.push(req.user._id);
    }

    await note.save();
    res.json({ 
      status: 'success', 
      data: { 
        likes: note.likes.length,
        hasLiked: !hasLiked
      } 
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Increment download count
router.post('/:id/download', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }

    note.downloads += 1;
    await note.save();

    res.json({ status: 'success', data: { downloads: note.downloads } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;