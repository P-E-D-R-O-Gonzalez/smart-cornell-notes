import { openai } from '@/lib/openai';

export async function extractTextFromImage(base64Image: string): Promise<string> {
    const imageUrl = base64Image.startsWith('data:image/')
        ? base64Image
        : `data:image/jpeg;base64,${base64Image}`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: 'You are a helpful assistant that transcribes handwritten text from images. Identify and transcribe the handwritten text in the image, preserving as much accuracy as possible'
            },
            {
                role: 'user',
                content: [{ type: 'image_url', image_url: { url: imageUrl } }]
            }
        ]
    });

    return response.choices[0].message.content || '';
}

export async function POST(req: Request) {
    try {
        const { base64Image } = await req.json();
        if (!base64Image) {
            return Response.json({ error: 'base64Image is required' }, { status: 400 });
        }
        const rawText = await extractTextFromImage(base64Image);
        return Response.json({ rawText });
    } catch (err: any) {
        console.error('Error in OCR extraction:', err);
        return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};