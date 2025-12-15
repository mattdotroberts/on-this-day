import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { logError } from '@/lib/log-error';

// Gemini 2.5 Flash TTS supports these voices
const VALID_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'Puck' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Validate voice
    if (!VALID_VOICES.includes(voice)) {
      return NextResponse.json({ error: 'Invalid voice' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Use Gemini 2.5 Flash with TTS capabilities
    // Content must be an array with parts structure
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'], // Must be uppercase
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
    });

    // Extract audio data from response
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!data) {
      console.error('No audio data in response:', JSON.stringify(response, null, 2));
      await logError('narration', new Error('No audio data in TTS response'), {
        responseStructure: {
          hasCandidates: !!response.candidates,
          candidatesLength: response.candidates?.length,
          hasContent: !!response.candidates?.[0]?.content,
          hasParts: !!response.candidates?.[0]?.content?.parts,
        },
      });
      return NextResponse.json({ error: 'No audio generated' }, { status: 500 });
    }

    // Audio is PCM data at 24kHz, mono, 16-bit
    // Convert base64 to buffer and return as WAV
    const pcmBuffer = Buffer.from(data, 'base64');

    // Create a simple WAV header for raw PCM data
    const wavBuffer = createWavBuffer(pcmBuffer, 24000, 1, 16);

    return new NextResponse(wavBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': wavBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Narration error:', error);

    // Log detailed error info
    await logError('narration', error, {
      errorDetails: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to generate narration' },
      { status: 500 }
    );
  }
}

/**
 * Create a WAV file buffer from raw PCM data
 */
function createWavBuffer(pcmData: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize - 8;

  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // audio format (PCM)
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);

  return buffer;
}
