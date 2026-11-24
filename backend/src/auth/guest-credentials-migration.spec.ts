import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('adds the credential table without changing existing account records', () => {
  const sqlite = new Database(':memory:');
  const directory = new URL('../../prisma/migrations/', import.meta.url);
  const addition = '20261124010000_guest_credentials';
  try {
    for (const entry of readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === addition) continue;
      sqlite.exec(readFileSync(new URL(entry.name + '/migration.sql', directory), 'utf8'));
    }
    sqlite.prepare('INSERT INTO Role (id, name, updatedAt) VALUES (?, ?, ?)').run('role', 'GUEST', Date.now());
    sqlite.prepare('INSERT INTO User (id, roleId, name, email, passwordHash, status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('user', 'role', 'Existing guest', 'existing@example.invalid', 'synthetic-hash', 'ACTIVE', Date.now());
    const before = sqlite.prepare('SELECT * FROM User').all();
    sqlite.exec(readFileSync(fileURLToPath(new URL(addition + '/migration.sql', directory)), 'utf8'));
    expect(sqlite.prepare('SELECT * FROM User').all()).toEqual(before);
    expect(sqlite.prepare('SELECT count(*) AS count FROM GuestCredentialToken').get()).toEqual({ count: 0 });
    expect(sqlite.pragma('foreign_key_check')).toEqual([]);
  } finally { sqlite.close(); }
});
