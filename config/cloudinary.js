const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to upload image
const uploadImage = async (file, folder = 'trading-platform') => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Helper function to upload video
const uploadVideo = async (file, folder = 'trading-platform/videos') => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: folder,
      resource_type: 'video',
      allowed_formats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      eager: [
        { width: 1280, height: 720, crop: 'scale', quality: 'auto:good' },
        { width: 854, height: 480, crop: 'scale', quality: 'auto:good' }
      ],
      eager_async: true
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      size: result.bytes,
      duration: result.duration,
      thumbnail: result.thumbnail_url
    };
  } catch (error) {
    console.error('Cloudinary video upload error:', error);
    throw new Error('Failed to upload video');
  }
};

// Helper function to upload document
const uploadDocument = async (file, folder = 'trading-platform/documents') => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: folder,
      resource_type: 'raw',
      allowed_formats: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt']
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary document upload error:', error);
    throw new Error('Failed to upload document');
  }
};

// Helper function to delete file
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file');
  }
};

// Helper function to generate thumbnail
const generateThumbnail = async (videoUrl, options = {}) => {
  try {
    const { width = 300, height = 200, crop = 'thumb' } = options;
    
    const thumbnailUrl = cloudinary.url(videoUrl, {
      transformation: [
        { width, height, crop, quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    return thumbnailUrl;
  } catch (error) {
    console.error('Cloudinary thumbnail generation error:', error);
    throw new Error('Failed to generate thumbnail');
  }
};

// Helper function to optimize image
const optimizeImage = async (imageUrl, options = {}) => {
  try {
    const { width, height, crop = 'scale', quality = 'auto:good' } = options;
    
    const optimizedUrl = cloudinary.url(imageUrl, {
      transformation: [
        { width, height, crop, quality },
        { fetch_format: 'auto' }
      ]
    });

    return optimizedUrl;
  } catch (error) {
    console.error('Cloudinary image optimization error:', error);
    throw new Error('Failed to optimize image');
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadVideo,
  uploadDocument,
  deleteFile,
  generateThumbnail,
  optimizeImage
};
