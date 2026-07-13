import { NextRequest, NextResponse } from 'next/server';
import { buildBackendApiUrl } from '@/lib/apiBackendProxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const { certificateId } = await params;

    const response = await fetch(buildBackendApiUrl(request, `certificates/download/${certificateId}`), {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    // Get the PDF file as a buffer
    const pdfBuffer = await response.arrayBuffer();
    
    // Return the PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate_${certificateId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Certificate download API error:', error);
    return NextResponse.json(
      { error: 'Failed to download certificate' },
      { status: 500 }
    );
  }
}
