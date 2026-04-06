import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const size = parseInt(searchParams.get('size') || '300');
    const format = searchParams.get('format') || 'png'; // 'png' or 'svg'
    const fgColor = searchParams.get('fg') || '#000000';
    const bgColor = searchParams.get('bg') || '#FFFFFF';
    const margin = parseInt(searchParams.get('margin') || '2');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Clamp size between 100 and 1000
    const clampedSize = Math.max(100, Math.min(1000, size));
    const clampedMargin = Math.max(0, Math.min(10, margin));

    if (format === 'svg') {
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        width: clampedSize,
        margin: clampedMargin,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: 'M',
      });

      return new NextResponse(svgString, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400', // 24h cache
        },
      });
    }

    // Default: PNG
    const pngBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: clampedSize,
      margin: clampedMargin,
      color: {
        dark: fgColor,
        light: bgColor,
      },
      errorCorrectionLevel: 'M',
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': pngBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
