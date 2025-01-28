import WaveSurfer from "wavesurfer.js";

export const createWaveform = async (
  container: HTMLElement,
  base64Data: string
): Promise<WaveSurfer> => {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "audio/webm" });

  const wavesurfer = WaveSurfer.create({
    container,
    height: 55,
    progressColor: "rgba(0, 0, 0, 1)",
    cursorColor: "transparent",
    cursorWidth: 1,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    interact: false,
  });

  wavesurfer.on("play", () => {
    wavesurfer.setOptions({ cursorColor: "rgba(199, 24, 24, 0.56)" });
  });

  wavesurfer.on("pause", () => {
    wavesurfer.setOptions({ cursorColor: "transparent" });
  });

  await wavesurfer.loadBlob(blob);
  return wavesurfer;
};

export const createAudioFromBase64 = (base64Data: string): HTMLAudioElement => {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "audio/webm" });
  return new Audio(URL.createObjectURL(blob));
};

export const getSupportedMimeType = (): string => {
  if (MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a.40.2")) {
    return "audio/mp4;codecs=mp4a.40.2";
  }
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  return "audio/mp4";
};

export const base64FromBlob = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};
