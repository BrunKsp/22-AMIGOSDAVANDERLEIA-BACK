import axios from "axios";
import { Blob } from "buffer";

export class TranscriptionService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY não definida");
    this.apiKey = apiKey;
  }

  async transcribe(audioBuffer: Buffer, mimetype: string = "audio/ogg"): Promise<string> {
    const ext = mimetype.includes("mp4") ? "mp4" : mimetype.includes("mpeg") ? "mp3" : "ogg";

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: mimetype }), `audio.${ext}`);
    formData.append("model", "whisper-1");
    formData.append("language", "pt");

    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      formData,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    return response.data.text as string;
  }
}
