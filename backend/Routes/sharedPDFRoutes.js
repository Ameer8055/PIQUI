const express = require('express');
const router = express.Router();
const SharedPDF = require('../Models/SharedPDF');
const { auth } = require('../Middlewares/authMiddleware');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../Middlewares/uploadMiddleware');

// Get all shared PDFs (public) - only approved PDFs
router.get('/', async (req, res) => {
  try {
    const { subject, page = 1, limit = 12, search } = req.query;
    
    let query = { isApproved: true }; // Only show approved PDFs
    
    if (subject && subject !== 'all') {
      query.subject = subject;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pdfs = await SharedPDF.find(query)
      .populate('uploadedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SharedPDF.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        pdfs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Upload a PDF to share
router.post('/upload', auth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'PDF file is required' });
    }

    const { title, subject, description } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ status: 'error', message: 'Title and subject are required' });
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'shared-pdfs');

    const sharedPDF = new SharedPDF({
      title,
      fileName: req.file.originalname,
      filePath: cloudinaryResult.secure_url, // Keep for backward compatibility
      cloudinaryPublicId: cloudinaryResult.public_id,
      cloudinaryUrl: cloudinaryResult.secure_url,
      fileSize: req.file.size,
      subject,
      description: description || '',
      uploadedBy: req.user._id,
      uploaderName: req.user.name
    });

    await sharedPDF.save();
    await sharedPDF.populate('uploadedBy', 'name avatar');

    res.status(201).json({
      status: 'success',
      data: sharedPDF
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Error uploading PDF' });
  }
});

// Download a shared PDF (fetches from Cloudinary and streams to client)
// Made public since PDFs are shared publicly
router.get('/:id/download', async (req, res) => {
  try {
    const pdf = await SharedPDF.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }

    // Increment download count
    pdf.downloads += 1;
    await pdf.save();

    // Get Cloudinary URL
    const downloadUrl = pdf.cloudinaryUrl || pdf.filePath;
    
    // Fetch PDF from Cloudinary
    const https = require('https');
    const http = require('http');
    const url = require('url');
    
    const parsedUrl = new URL(downloadUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    protocol.get(downloadUrl, (cloudinaryRes) => {
      // Set headers to force download with proper filename
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdf.fileName)}"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', cloudinaryRes.headers['content-length'] || '');
      
      // Pipe the PDF from Cloudinary to the client
      cloudinaryRes.pipe(res);
      
      cloudinaryRes.on('error', (error) => {
        console.error('Error fetching PDF from Cloudinary:', error);
        if (!res.headersSent) {
          res.status(500).json({ status: 'error', message: 'Error fetching PDF from cloud storage' });
        }
      });
    }).on('error', (error) => {
      console.error('Error downloading PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ status: 'error', message: error.message });
      }
    });
  } catch (error) {
    console.error('Error downloading PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
});

// Like/unlike a PDF
router.post('/:id/like', auth, async (req, res) => {
  try {
    const pdf = await SharedPDF.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }

    const hasLiked = pdf.likes.some(like => like.toString() === req.user._id.toString());
    
    if (hasLiked) {
      pdf.likes = pdf.likes.filter(like => like.toString() !== req.user._id.toString());
    } else {
      pdf.likes.push(req.user._id);
    }

    await pdf.save();
    res.json({
      status: 'success',
      data: {
        likes: pdf.likes.length,
        hasLiked: !hasLiked
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Delete own PDF
router.delete('/:id', auth, async (req, res) => {
  try {
    const pdf = await SharedPDF.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id
    });
    
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }

    // Delete file from Cloudinary
    if (pdf.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(pdf.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await SharedPDF.findByIdAndDelete(req.params.id);

    res.json({ status: 'success', message: 'PDF deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
