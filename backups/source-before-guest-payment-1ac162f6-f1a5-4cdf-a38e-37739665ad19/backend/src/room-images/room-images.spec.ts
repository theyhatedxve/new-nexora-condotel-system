
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  realpathSync,
} from 'node:fs';
import {
  mkdtemp,
  readdir,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import sharp from 'sharp';

import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

import { ImageStorageService } from './image-storage.service.js';
import { ImageValidationService } from './image-validation.service.js';
import { RoomImagesService } from './room-images.service.js';

const testDb = resolve(process.cwd(), 'phase4.step4.test.db');
const devDb = resolve(process.cwd(), 'dev.db');

const suffix = randomUUID();

let prisma: PrismaClient;
let service: RoomImagesService;
let storage: ImageStorageService;
let temporaryDirectory = '';
let previousStorageDirectory: string | undefined;

let propertyId = '';
let roomTypeId = '';
let firstImageId = '';
let secondImageId = '';

function checkIsolation(): void {
  if (process.cwd().split(/[\\/]/).at(-1) !== 'backend') {
    throw new Error('Run tests from backend/.');
  }

  if (!existsSync(testDb)) {
    throw new Error('Missing isolated Phase 4 Step 4 database.');
  }

  if (
    existsSync(devDb) &&
    realpathSync(testDb) === realpathSync(devDb)
  ) {
    throw new Error('Refusing to test against dev.db.');
  }
}

async function sampleImage(
  format: 'jpeg' | 'png' | 'webp',
): Promise<Buffer> {
  const base = sharp({
    create: {
      width: 40,
      height: 30,
      channels: 3,
      background: '#447799',
    },
  });

  if (format === 'jpeg') return base.jpeg().toBuffer();
  if (format === 'png') return base.png().toBuffer();
  return base.webp().toBuffer();
}

function fileFixture(buffer: Buffer): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'anything.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: null as never,
  };
}

describe('Phase 4 Step 4 — Room Images', () => {
  beforeAll(async () => {
    checkIsolation();

    temporaryDirectory = await mkdtemp(
      join(tmpdir(), 'nexora-step4-images-'),
    );

    previousStorageDirectory =
      process.env.ROOM_IMAGE_STORAGE_DIR;

    process.env.ROOM_IMAGE_STORAGE_DIR = temporaryDirectory;

    storage = new ImageStorageService();

    const adapter = new PrismaBetterSqlite3({
      url: 'file:./phase4.step4.test.db',
    });

    prisma = new PrismaClient({ adapter });
    await prisma.$connect();

    const property = await prisma.property.create({
      data: {
        name: `Image Test Property ${suffix}`,
        address: 'Test Street',
        city: 'Test City',
        province: 'Test Province',
      },
    });

    propertyId = property.id;

    const roomType = await prisma.roomType.create({
      data: {
        propertyId,
        name: `Image Test Suite ${suffix}`,
        capacity: 2,
        baseRateCentavos: 250000,
      },
    });

    roomTypeId = roomType.id;

    service = new RoomImagesService(
      prisma as never,
      storage,
      new ImageValidationService(),
    );
  });

  afterAll(async () => {
    try {
      if (prisma) {
        if (roomTypeId) {
          await prisma.roomImage.deleteMany({
            where: { roomTypeId },
          });
        }

        if (propertyId) {
          await prisma.roomType.deleteMany({
            where: { propertyId },
          });

          await prisma.property.delete({
            where: { id: propertyId },
          });
        }

        await prisma.$disconnect();
      }
    } finally {
      if (previousStorageDirectory === undefined) {
        delete process.env.ROOM_IMAGE_STORAGE_DIR;
      } else {
        process.env.ROOM_IMAGE_STORAGE_DIR =
          previousStorageDirectory;
      }

      if (temporaryDirectory) {
        await rm(temporaryDirectory, {
          recursive: true,
          force: true,
        });
      }
    }
  });

  it('accepts and normalizes JPEG, PNG, and WebP', async () => {
    const validation = new ImageValidationService();

    for (const format of ['jpeg', 'png', 'webp'] as const) {
      const normalized = await validation.normalize(
        fileFixture(await sampleImage(format)),
      );

      const metadata = await sharp(normalized).metadata();

      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(40);
      expect(metadata.height).toBe(30);
    }
  });

  it('rejects invalid and unsupported image data', async () => {
    const validation = new ImageValidationService();

    await expect(
      validation.normalize(
        fileFixture(Buffer.from('<svg></svg>')),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      validation.normalize(
        fileFixture(Buffer.from('not really a picture')),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects oversized source images', async () => {
    const validation = new ImageValidationService();

    await expect(
      validation.normalize(
        fileFixture(Buffer.alloc(5 * 1024 * 1024 + 1)),
      ),
    ).rejects.toThrow();
  });

  it('uploads the first gallery image as primary', async () => {
    const result = await service.upload(
      roomTypeId,
      fileFixture(await sampleImage('jpeg')),
      'Deluxe Suite',
      10,
    );

    firstImageId = result.id;

    expect(result.isPrimary).toBe(true);
    expect(result.displayOrder).toBe(10);
    expect(result.url).toContain('/api/room-images/');

    const files = await readdir(temporaryDirectory);

    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^[0-9a-f-]{36}\.webp$/);
  });

  it('adds a second image without changing primary', async () => {
    const result = await service.upload(
      roomTypeId,
      fileFixture(await sampleImage('png')),
      'Bathroom',
      5,
    );

    secondImageId = result.id;

    expect(result.isPrimary).toBe(false);

    const images = await service.list(roomTypeId);

    expect(images.map((image) => image.id)).toEqual([
      secondImageId,
      firstImageId,
    ]);
  });

  it('changes the primary image atomically', async () => {
    await service.update(roomTypeId, secondImageId, {
      isPrimary: true,
      displayOrder: 0,
    });

    const images = await service.list(roomTypeId);
    const primaries = images.filter((image) => image.isPrimary);

    expect(primaries).toHaveLength(1);
    expect(primaries[0].id).toBe(secondImageId);
  });

  it('serves the normalized image bytes', async () => {
    const buffer = await service.readPublicImage(firstImageId);
    const metadata = await sharp(buffer).metadata();

    expect(metadata.format).toBe('webp');
  });

  it('rejects invalid image paths', async () => {
    await expect(
      storage.read('../dev.db'),
    ).rejects.toThrow();
  });

  it('rejects nonexistent room types', async () => {
    await expect(
      service.upload(
        'nonexistent-room-type',
        fileFixture(await sampleImage('webp')),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes one image without deleting the room type', async () => {
    await service.remove(roomTypeId, secondImageId);

    const images = await service.list(roomTypeId);

    expect(images).toHaveLength(1);
    expect(images[0].id).toBe(firstImageId);
    expect(images[0].isPrimary).toBe(true);

    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    expect(roomType).not.toBeNull();

    const files = await readdir(temporaryDirectory);

    expect(files).toHaveLength(1);
  });

  it('rejects image lookup for a nonexistent image', async () => {
    await expect(
      service.readPublicImage('missing-image'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
