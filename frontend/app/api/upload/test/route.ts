import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    return NextResponse.json({
      status: 'success',
      cloudName,
      apiKey: apiKey ? '***' + apiKey.slice(-4) : 'not set',
      apiSecret: apiSecret ? '***' + apiSecret.slice(-4) : 'not set',
      uploadMethod: 'signed',
      message: 'Environment variables check - using signed uploads'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
