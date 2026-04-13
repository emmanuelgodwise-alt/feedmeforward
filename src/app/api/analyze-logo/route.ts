import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const zai = await ZAI.create();
    const imageBuffer = await fs.readFile('/home/z/my-project/upload/c00b54fc-d1f2-474c-a59a-0bd51ce8c798.png');
    const base64Image = imageBuffer.toString('base64');

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this logo in full detail: colors, shapes, icons, text, style, mood, and any symbolism you can identify.' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    });

    return NextResponse.json({ analysis: response.choices[0]?.message?.content });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
