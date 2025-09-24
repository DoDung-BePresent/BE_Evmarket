import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";

/**
 * Compress and resize an image buffer.
 * @param buffer - Raw image buffer
 * @param options - { width, format, quality }
 * @returns Buffer of compressed image
 */
export async function compressImage(
  buffer: Buffer,
  options?: {
    width?: number;
    format?: "webp" | "jpeg" | "png";
    quality?: number;
  },
): Promise<Buffer> {
  const { width = 800, format = "webp", quality = 80 } = options || {};
  return sharp(buffer).resize({ width })[format]({ quality }).toBuffer();
}

/**
 * Compress video buffer to mp4/webm with limited bitrate and size.
 * @param buffer - Raw video buffer
 * @param options - { format, maxBitrate, maxSizeMB }
 * @returns Buffer of compressed video
 */
export async function compressVideo(
  buffer: Buffer,
  options?: {
    format?: "mp4" | "webm";
    maxBitrate?: number; // kbps
    maxSizeMB?: number;
  },
): Promise<Buffer> {
  const { format = "mp4", maxBitrate = 1200, maxSizeMB = 20 } = options || {};
  const inputPath = join(tmpdir(), `input-${Date.now()}.mp4`);
  const outputPath = join(tmpdir(), `output-${Date.now()}.${format}`);

  await writeFile(inputPath, buffer);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoBitrate(maxBitrate)
      .outputOptions("-movflags faststart")
      .toFormat(format)
      .on("end", async () => {
        try {
          const outBuffer = await import("fs").then((fs) =>
            fs.readFileSync(outputPath),
          );
          // Clean up temp files
          await unlink(inputPath);
          await unlink(outputPath);
          // Check size
          if (outBuffer.length > maxSizeMB * 1024 * 1024) {
            return reject(
              new Error("Compressed video exceeds max allowed size"),
            );
          }
          resolve(outBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", async (err: any) => {
        await unlink(inputPath).catch(() => {});
        await unlink(outputPath).catch(() => {});
        reject(err);
      })
      .save(outputPath);
  });
}
