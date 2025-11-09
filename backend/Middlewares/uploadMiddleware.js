const multer = require('multer');
const cloudinary = require('../Config/cloudinary');

// Use memory storage since we'll upload directly to Cloudinary
const storage = multer.memoryStorage();

// File filter for PDFs, DOCX, and images
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOCX, and image files (JPG, PNG, GIF, BMP, WEBP) are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: fileFilter
});

// Helper function to upload file to Cloudinary
const uploadToCloudinary = (buffer, folder = 'quiz-files', mimeType = 'application/pdf') => {
  return new Promise((resolve, reject) => {
    // Determine resource type based on mime type
    let resourceType = 'raw';
    let dataUri;
    
    if (mimeType === 'application/pdf') {
      const base64String = buffer.toString('base64');
      dataUri = `data:application/pdf;base64,${base64String}`;
      resourceType = 'raw';
    } else if (mimeType.startsWith('image/')) {
      const base64String = buffer.toString('base64');
      dataUri = `data:${mimeType};base64,${base64String}`;
      resourceType = 'image';
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const base64String = buffer.toString('base64');
      dataUri = `data:${mimeType};base64,${base64String}`;
      resourceType = 'raw';
    } else {
      const base64String = buffer.toString('base64');
      dataUri = `data:${mimeType};base64,${base64String}`;
      resourceType = 'raw';
    }

    cloudinary.uploader.upload(
      dataUri,
      {
        folder: folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
};

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Helper function to get Cloudinary URL
const getCloudinaryUrl = (publicId) => {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    secure: true
  });
};

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinaryUrl
};
