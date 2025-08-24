import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', file.name, file.type, file.size);

    // Check environment variables
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Missing Cloudinary credentials:', { 
        cloudName: !!cloudName, 
        apiKey: !!apiKey, 
        apiSecret: !!apiSecret 
      });
      return NextResponse.json({ error: 'Cloudinary configuration missing' }, { status: 500 });
    }

    console.log('Using Cloudinary config:', { cloudName, apiKey: '***' + apiKey.slice(-4) });

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // Generate signature for signed upload
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = generateSignature(apiSecret, timestamp);

    // Upload to Cloudinary with signed authentication
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    
    const uploadFormData = new FormData();
    uploadFormData.append('file', dataURI);
    uploadFormData.append('api_key', apiKey);
    uploadFormData.append('timestamp', timestamp.toString());
    uploadFormData.append('signature', signature);
    uploadFormData.append('resource_type', 'auto');
    uploadFormData.append('folder', 'lms-uploads');

    console.log('Uploading to Cloudinary with signed auth:', cloudinaryUrl);

    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    console.log('Cloudinary response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary upload failed:', response.status, errorText);
      throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Upload successful:', result.secure_url);
    
    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Generate Cloudinary signature for signed uploads
function generateSignature(apiSecret: string, timestamp: number): string {
  const crypto = require('crypto');
  
  // Create the string to sign (you can add more parameters if needed)
  const params = {
    timestamp: timestamp,
    folder: 'lms-uploads'
  };
  
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key as keyof typeof params]}`)
    .join('&');
  
  // Create signature
  const signature = crypto
    .createHash('sha1')
    .update(sortedParams + apiSecret)
    .digest('hex');
  
  return signature;
}
