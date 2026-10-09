import type { ImageType } from "@/lib/ai/schemas";
import { MAX_IMAGE_BASE64 } from "@/lib/ai/schemas";

export interface PickedImage {
  mediaType: ImageType;
  data: string; // base64, no prefix
  preview: string; // data URL for the thumbnail
  name: string;
}

const ATTEMPTS: { side: number; quality: number }[] = [
  { side: 1600, quality: 0.82 },
  { side: 1400, quality: 0.72 },
  { side: 1200, quality: 0.62 },
  { side: 1000, quality: 0.55 },
];

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be opened."));
    };
    img.src = url;
  });
}

/** Shrinks a photo in the browser so a phone picture does not become a huge upload. */
export async function shrinkImage(file: File): Promise<PickedImage> {
  const img = await load(file);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (!longest) throw new Error("That image could not be opened.");

  for (const a of ATTEMPTS) {
    const scale = Math.min(1, a.side / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process the image.");
    ctx.fillStyle = "#ffffff"; // transparent PNGs become white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", a.quality);
    const data = url.slice(url.indexOf(",") + 1);
    if (data.length <= MAX_IMAGE_BASE64) {
      return { mediaType: "image/jpeg", data, preview: url, name: file.name };
    }
  }
  throw new Error("That photo is too large even after shrinking. Please try a smaller one.");
}
