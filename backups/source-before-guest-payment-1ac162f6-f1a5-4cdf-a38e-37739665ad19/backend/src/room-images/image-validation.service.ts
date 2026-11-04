
import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';

import sharp from 'sharp';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;

@Injectable()
export class ImageValidationService {
  async normalize(file: Express.Multer.File | undefined): Promise<Buffer> {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('An image file is required.');
    }

    if (file.buffer.length > MAX_IMAGE_BYTES) {
      throw new PayloadTooLargeException('Image exceeds the 5 MB limit.');
    }

    try {
      const metadata = await sharp(file.buffer, {
        limitInputPixels: MAX_PIXELS,
        failOn: 'error',
      }).metadata();

      if (
        !metadata.format ||
        !['jpeg', 'png', 'webp'].includes(metadata.format)
      ) {
        throw new BadRequestException(
          'Only JPEG, PNG and WebP images are allowed.',
        );
      }

      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Invalid image dimensions.');
      }

      // Re-encode from decoded pixels; do not copy source metadata.
      return await sharp(file.buffer, {
        limitInputPixels: MAX_PIXELS,
        failOn: 'error',
      })
        .rotate()
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'The uploaded file is not a valid supported image.',
      );
    }
  }
}
