
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { isAbsolute, join, resolve, sep } from 'node:path';

const STORAGE_KEY_PATTERN = /^[0-9a-f-]{36}\.webp$/i;

@Injectable()
export class ImageStorageService {
  private readonly directory: string;

  constructor() {
    const configured = process.env.ROOM_IMAGE_STORAGE_DIR;

    this.directory = configured
      ? resolve(configured)
      : resolve(process.cwd(), '..', 'storage', 'room-images');

    if (!isAbsolute(this.directory)) {
      throw new Error('Image storage directory must be absolute.');
    }
  }

  private pathFor(key: string): string {
    if (!STORAGE_KEY_PATTERN.test(key)) {
      throw new InternalServerErrorException(
        'Invalid stored image reference.',
      );
    }

    const path = resolve(this.directory, key);

    if (!path.startsWith(this.directory + sep)) {
      throw new InternalServerErrorException(
        'Invalid image storage path.',
      );
    }

    return path;
  }

  async save(buffer: Buffer): Promise<string> {
    await mkdir(this.directory, { recursive: true });

    const key = `${randomUUID()}.webp`;

    await writeFile(this.pathFor(key), buffer, {
      flag: 'wx',
      mode: 0o600,
    });

    return key;
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  async remove(key: string): Promise<void> {
    await unlink(this.pathFor(key));
  }

  async stageRemoval(key: string): Promise<string> {
    const stagedKey = `${randomUUID()}.pending-delete`;

    await rename(
      this.pathFor(key),
      join(this.directory, stagedKey),
    );

    return stagedKey;
  }

  async restoreRemoval(
    stagedKey: string,
    originalKey: string,
  ): Promise<void> {
    await rename(
      this.stagedPath(stagedKey),
      this.pathFor(originalKey),
    );
  }

  async finalizeRemoval(stagedKey: string): Promise<void> {
    await unlink(this.stagedPath(stagedKey));
  }

  private stagedPath(key: string): string {
    if (!/^[0-9a-f-]{36}\.pending-delete$/i.test(key)) {
      throw new InternalServerErrorException(
        'Invalid staged image reference.',
      );
    }

    return join(this.directory, key);
  }
}
