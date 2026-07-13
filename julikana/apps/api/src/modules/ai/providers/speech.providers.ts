import { Injectable, ServiceUnavailableException } from "@nestjs/common";

@Injectable()
export class SpeechService {
  /** ElevenLabs text-to-speech → MP3 buffer (voiceovers for videos). */
  async textToSpeech(text: string, voiceId = "21m00Tcm4TlvDq8ikWAM"): Promise<Buffer> {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new ServiceUnavailableException("ElevenLabs not configured");
    }
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    return Buffer.from(await res.arrayBuffer());
  }

  /** Whisper transcription — used for auto-captions and subtitles. */
  async transcribe(audio: Buffer, filename = "audio.mp3"): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      throw new ServiceUnavailableException("Whisper (OpenAI) not configured");
    }
    const form = new FormData();
    form.set("model", "whisper-1");
    form.set("file", new Blob([new Uint8Array(audio)]), filename);
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Whisper ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.text;
  }
}
