import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Step 7.2 — additive checkout migration', () => {
  it('preserves existing receipts and permits multiple null request keys while enforcing non-null uniqueness', () => {
    const root = process.cwd();
    const directory = mkdtempSync(resolve(root, '.phase7-migration-'));
    const db = new DatabaseSync(resolve(directory, 'upgrade.test.db'));
    try {
      const migrations = resolve(root, 'prisma/migrations');
      const latest = '20261101090000_payment_checkout_attempts';
      for (const entry of readdirSync(migrations, { withFileTypes: true })
        .filter((item) => item.isDirectory() && item.name.localeCompare(latest) < 0)
        .sort((a, b) => a.name.localeCompare(b.name))) {
        db.exec(readFileSync(resolve(migrations, entry.name, 'migration.sql'), 'utf8'));
      }
      db.exec(`
        INSERT INTO Property (id,name,address,city,province,updatedAt) VALUES ('property','Test','Test','Test','Test',CURRENT_TIMESTAMP);
        INSERT INTO RoomType (id,propertyId,name,capacity,baseRateCentavos,updatedAt) VALUES ('type','property','Test',2,250000,CURRENT_TIMESTAMP);
        INSERT INTO Guest (id,firstName,lastName,updatedAt) VALUES ('guest','Test','Guest',CURRENT_TIMESTAMP);
        INSERT INTO Reservation (id,reservationNumber,guestId,roomTypeId,checkInDate,checkOutDate,guestCount,nightlyRateCentavos,totalAmountCentavos,status,updatedAt)
          VALUES ('booking','NX-fixture','guest','type','2026-11-01T00:00:00.000Z','2026-11-04T00:00:00.000Z',2,250000,750000,'CONFIRMED',CURRENT_TIMESTAMP);
        INSERT INTO Payment (id,reservationId,method,status,amountCentavos,currency,paidAt,referenceNumber,updatedAt)
          VALUES ('payment-a','booking','PAY_AT_PROPERTY','PAID',250000,'PHP',CURRENT_TIMESTAMP,'fixture-a',CURRENT_TIMESTAMP);
        INSERT INTO Payment (id,reservationId,method,status,amountCentavos,currency,paidAt,referenceNumber,updatedAt)
          VALUES ('payment-b','booking','PAY_AT_PROPERTY','PAID',500000,'PHP',CURRENT_TIMESTAMP,'fixture-b',CURRENT_TIMESTAMP);
      `);
      const before = db.prepare('SELECT * FROM Payment ORDER BY id').all();
      db.exec(readFileSync(resolve(migrations, latest, 'migration.sql'), 'utf8'));
      const after = db.prepare('SELECT * FROM Payment ORDER BY id').all();
      expect(after).toHaveLength(2);
      after.forEach((row, index) => {
        expect(row).toMatchObject(before[index]);
        expect(row.checkoutRequestKeyHash).toBeNull();
        expect(row.checkoutRequestFingerprint).toBeNull();
        expect(row.checkoutState).toBeNull();
        expect(row.checkoutUrl).toBeNull();
      });
      db.exec(`UPDATE Payment SET checkoutRequestKeyHash='fixture-key' WHERE id='payment-a'`);
      expect(() => db.exec(`UPDATE Payment SET checkoutRequestKeyHash='fixture-key' WHERE id='payment-b'`)).toThrow();
      expect(db.prepare('SELECT status FROM Reservation').get()?.status).toBe('CONFIRMED');
    } finally {
      db.close();
      if (resolve(directory, '..') === resolve(root) && directory.startsWith(resolve(root, '.phase7-migration-'))) {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });
});
