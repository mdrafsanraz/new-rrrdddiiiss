export type AudioCompatibility = {
  format: "wav" | "flac" | "unknown";
  bitDepth: number | null;
  compatible: boolean;
  error: string | null;
  canConvert: boolean;
};

const HIGH_RES_FLAC_ERROR =
  "High-resolution FLAC uploads are not supported. Upload a WAV file (16-, 24-, or 32-bit), or convert this FLAC to 16-bit WAV.";

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readWavBitDepth(bytes: Uint8Array): number | null {
  if (bytes.length < 12 || readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WAVE") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunk = readAscii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    if (chunk === "fmt " && size >= 16 && offset + 24 <= bytes.length) {
      return view.getUint16(offset + 22, true);
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}

function readFlacBitDepth(bytes: Uint8Array): number | null {
  if (bytes.length < 42 || readAscii(bytes, 0, 4) !== "fLaC") return null;
  let offset = 4;
  while (offset + 4 <= bytes.length) {
    const type = bytes[offset] & 0x7f;
    const size = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const dataOffset = offset + 4;
    if (type === 0 && size >= 34 && dataOffset + 14 <= bytes.length) {
      return (((bytes[dataOffset + 12] & 1) << 4) | (bytes[dataOffset + 13] >> 4)) + 1;
    }
    offset = dataOffset + size;
  }
  return null;
}

export function inspectAudioBytes(
  header: Uint8Array,
  filename: string,
  mimeType: string,
): AudioCompatibility {
  const name = filename.toLowerCase();
  const isFlac = readAscii(header, 0, 4) === "fLaC" || name.endsWith(".flac") || mimeType.includes("flac");
  const isWav = readAscii(header, 0, 4) === "RIFF" || name.endsWith(".wav") || mimeType.includes("wav");

  if (isFlac) {
    const bitDepth = readFlacBitDepth(header);
    if (bitDepth === null) {
      return { format: "flac", bitDepth, compatible: false, error: "Could not read this FLAC file's bit depth.", canConvert: true };
    }
    return bitDepth === 16
      ? { format: "flac", bitDepth, compatible: true, error: null, canConvert: false }
      : { format: "flac", bitDepth, compatible: false, error: HIGH_RES_FLAC_ERROR, canConvert: true };
  }

  if (isWav) {
    const bitDepth = readWavBitDepth(header);
    const compatible = bitDepth !== null && [16, 24, 32].includes(bitDepth);
    return {
      format: "wav",
      bitDepth,
      compatible,
      error: compatible ? null : "WAV audio must be 16-, 24-, or 32-bit.",
      canConvert: bitDepth !== null,
    };
  }

  return {
    format: "unknown",
    bitDepth: null,
    compatible: false,
    error: "Audio must be a WAV (16/24/32-bit) or FLAC (16-bit) file.",
    canConvert: false,
  };
}

export async function inspectAudioCompatibility(file: File): Promise<AudioCompatibility> {
  if (file.size <= 0 || file.size > 200 * 1024 * 1024) {
    return {
      format: "unknown",
      bitDepth: null,
      compatible: false,
      error: "Audio must be larger than 0 bytes and no more than 200 MB.",
      canConvert: false,
    };
  }
  const header = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
  return inspectAudioBytes(header, file.name, file.type);
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
}

function audioBufferTo16BitWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const frameCount = buffer.length;
  const dataSize = frameCount * channels * 2;
  const output = new ArrayBuffer(44 + dataSize);
  const view = new DataView(output);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([output], { type: "audio/wav" });
}

export async function convertAudioTo16BitWav(file: File): Promise<File> {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) throw new Error("Audio conversion is not supported in this browser.");
  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const wav = audioBufferTo16BitWav(decoded);
    if (wav.size > 200 * 1024 * 1024) {
      throw new Error("The converted WAV is larger than the 200 MB upload limit.");
    }
    const base = file.name.replace(/\.[^.]+$/, "") || "audio";
    return new File([wav], `${base}-16bit.wav`, { type: "audio/wav", lastModified: Date.now() });
  } catch (error) {
    if (error instanceof Error && error.message.includes("200 MB upload limit")) {
      throw error;
    }
    throw new Error("This browser could not decode the audio. Convert it to a 16-bit WAV in your audio editor and select it again.");
  } finally {
    await context.close().catch(() => undefined);
  }
}
