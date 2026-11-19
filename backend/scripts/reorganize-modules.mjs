import {
  existsSync, mkdirSync, readFileSync, readdirSync,
  statSync, unlinkSync, writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = path.join(backendRoot, "src");
const scriptPath = fileURLToPath(import.meta.url);
const backupRoot = fileURLToPath(new URL("../../backups/", import.meta.url));
const apply = process.argv.includes("--apply");
if (process.argv.slice(2).some((argument) => !["--preview", "--apply"].includes(argument))) {
  throw new Error("Use --preview or --apply.");
}

const groups = {
  reservations: {
    "guest-booking": [
      "guest-booking-expiration.spec.ts", "guest-booking-privacy.middleware.ts",
      "guest-booking-recovery.config.ts", "guest-booking-security.ts",
      "guest-booking.http.spec.ts", "guest-booking.service.ts", "guest-booking.spec.ts",
      "guest-bookings.controller.ts", "guest-reservations.controller.ts",
      "guest-reservations.service.ts", "reservation-crypto.ts",
    ],
    staff: [
      "guest-booking-staff-receipt.ts", "guest-booking-staff.controller.ts",
      "guest-booking-staff.http.spec.ts", "guest-booking-staff.service.ts",
      "staff-reservation-query.ts", "staff-reservations.controller.ts",
      "staff-reservations.service.ts",
    ],
    assignments: [
      "room-allocation.ts", "room-assignments.controller.ts",
      "room-assignments.http.spec.ts", "room-assignments.service.ts",
    ],
    lifecycle: [
      "reservation-cancellation.controller.ts", "reservation-cancellation.http.spec.ts",
      "reservation-cancellation.service.ts", "reservation-lifecycle.controller.ts",
      "reservation-lifecycle.http.spec.ts", "reservation-lifecycle.service.ts",
      "reservation-lifecycle.ts", "reservation-no-show.ts",
    ],
    stay: [
      "reservation-stay.controller.ts", "reservation-stay.http.spec.ts",
      "reservation-stay.service.ts", "stay-operations.controller.ts", "stay-operations.service.ts",
    ],
    charges: ["reservation-charges.controller.ts", "reservation-charges.service.ts"],
    deposits: ["reservation-deposits.controller.ts", "reservation-deposits.service.ts"],
    contacts: ["reservation-contacts.controller.ts", "reservation-contacts.service.ts"],
    inventory: [
      "inventory-reservation.ts", "inventory-write.spec.ts", "inventory-write.ts",
      "rental-reservation.ts", "reservation-acquisition.service.ts",
      "reservation-acquisition.spec.ts", "reservation-validation.service.ts",
      "reservation-validation.spec.ts",
    ],
    compatibility: [
      "booking-access.controller.ts", "booking-access.http.spec.ts",
      "reservations.controller.ts", "reservations.http.spec.ts",
    ],
    tests: ["reservation-intervals.spec.ts", "reservation-journeys.http.spec.ts"],
  },
  payments: {
    checkout: [
      "checkout-migration.spec.ts", "checkout-response.ts", "checkout.http.spec.ts",
      "checkout.service.ts", "online-payment-attempts.spec.ts", "online-payment-attempts.ts",
      "pending-online-booking.ts", "payments.controller.ts",
    ],
    collections: ["pay-at-property.controller.ts", "pay-at-property.service.ts"],
    refunds: ["refund-policy.ts", "refund-settlement.ts", "refunds.controller.ts", "refunds.service.ts"],
    reconciliation: [
      "financial-exceptions.ts", "payment-reconciliation.controller.ts",
      "payment-reconciliation.service.ts", "reconciliation-evidence.ts", "reconciliation-queue.ts",
    ],
    summary: [
      "payment-evidence.ts", "payment-summary.http.spec.ts", "payment-summary.service.ts",
      "payment-summary.spec.ts", "payment-summary.ts", "staff-payment-projection.ts",
      "staff-payments.controller.ts", "staff-payments.service.ts",
    ],
    deadlines: [
      "guest-booking-deadline.service.ts", "guest-booking-deadline.worker.spec.ts",
      "guest-booking-deadline.worker.ts",
    ],
  },
};

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function isFile(target) {
  return existsSync(target) && statSync(target).isFile();
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Review symbolic link manually: ${target}`);
      if (target === path.join(sourceRoot, "generated")) return [];
      return entry.isDirectory() ? walk(target) : [target];
    });
}

const moves = new Map();
for (const [moduleName, folders] of Object.entries(groups)) {
  const moduleRoot = path.join(sourceRoot, moduleName);
  const classified = new Set();
  for (const [folder, names] of Object.entries(folders)) {
    const destinationFolder = path.join(moduleRoot, folder);
    if (existsSync(destinationFolder)) {
      throw new Error(`Target folder already exists: ${destinationFolder}`);
    }
    for (const name of names) {
      if (classified.has(name)) throw new Error(`Duplicate manifest entry: ${moduleName}/${name}`);
      const from = path.join(moduleRoot, name);
      const to = path.join(destinationFolder, name);
      if (!inside(sourceRoot, from) || !inside(sourceRoot, to)) {
        throw new Error("A move is outside backend/src.");
      }
      if (!isFile(from)) throw new Error(`Expected source file missing: ${from}`);
      if (existsSync(to)) throw new Error(`Destination already exists: ${to}`);
      classified.add(name);
      moves.set(from, to);
    }
  }
  const entryName = `${moduleName}.module.ts`;
  for (const entry of readdirSync(moduleRoot, { withFileTypes: true })) {
    if (entry.isFile() && entry.name !== entryName && !classified.has(entry.name)) {
      throw new Error(`Unclassified module file: ${moduleName}/${entry.name}`);
    }
  }
}

const inspectedFiles = [
  ...walk(sourceRoot), ...walk(path.join(backendRoot, "test")),
  ...walk(path.join(backendRoot, "scripts")),
].filter((target) => target !== scriptPath && [".ts", ".js", ".mjs"].includes(path.extname(target)));

function resolveModule(importer, specifier) {
  const base = path.resolve(path.dirname(importer), specifier);
  const distRoot = path.join(backendRoot, "dist");
  if (inside(distRoot, base)) {
    return {
      source: path.join(sourceRoot, path.relative(distRoot, base)).replace(/\.js$/, ".ts"),
      compiled: true,
    };
  }
  const candidates = [base, base.replace(/\.js$/, ".ts"), `${base}.ts`, `${base}.js`,
    path.join(base, "index.ts"), path.join(base, "index.js")];
  const resolved = candidates.find(isFile);
  if (!resolved) throw new Error(`Unresolved relative import: ${importer} -> ${specifier}`);
  return { source: resolved, compiled: false };
}

function newSpecifier(importerDestination, target, originalSpecifier) {
  let relative = path.relative(path.dirname(importerDestination), target).replaceAll("\\", "/");
  if (originalSpecifier.endsWith(".js") && relative.endsWith(".ts")) {
    relative = relative.slice(0, -3) + ".js";
  }
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

const referencePattern = /\b(from|import|require)(\s*(?:\(\s*)?)(["'])(\.[^"'\r\n]+)\3/g;
const records = inspectedFiles.map((oldPath) => {
  const destination = moves.get(oldPath) ?? oldPath;
  const original = readFileSync(oldPath, "utf8");
  if (moves.has(oldPath) && /import\.meta\.url|\b__dirname\b|\b__filename\b/.test(original)) {
    throw new Error(`Location-dependent file requires manual review: ${oldPath}`);
  }
  const updated = original.replace(referencePattern,
    (match, keyword, spacing, quote, specifier) => {
      const reference = resolveModule(oldPath, specifier);
      if (reference.compiled) {
        const movedSource = moves.get(reference.source);
        if (!movedSource) return match;
        const compiledTarget = path.join(backendRoot, "dist", path.relative(sourceRoot, movedSource))
          .replace(/\.ts$/, ".js");
        return `${keyword}${spacing}${quote}` +
          newSpecifier(destination, compiledTarget, specifier) + quote;
      }
      const referencedDestination = moves.get(reference.source) ?? reference.source;
      if (destination === oldPath && referencedDestination === reference.source) return match;
      return `${keyword}${spacing}${quote}` +
        newSpecifier(destination, referencedDestination, specifier) + quote;
    });
  return { oldPath, destination, original, updated };
});

const affected = records.filter((record) =>
  record.oldPath !== record.destination || record.original !== record.updated);
console.log("Backend module relocation manifest:");
for (const [from, to] of moves) {
  console.log(`${path.relative(backendRoot, from)} -> ${path.relative(backendRoot, to)}`);
}
console.log(`\nFiles to move: ${moves.size}`);
console.log(`Files to move or update: ${affected.length}`);
if (!apply) {
  console.log("Preview only. No files changed.");
  process.exit(0);
}

const backupDirectory = path.join(backupRoot, `backend-module-layout-${randomUUID()}`);
mkdirSync(backupDirectory, { recursive: true });
for (const record of affected) {
  const target = path.join(backupDirectory, path.relative(backendRoot, record.oldPath));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, record.original, { encoding: "utf8", flag: "wx" });
}
writeFileSync(path.join(backupDirectory, "relocation-manifest.json"), JSON.stringify(
  affected.map(({ oldPath, destination }) => ({
    from: path.relative(backendRoot, oldPath), to: path.relative(backendRoot, destination),
  })), null, 2,
), { encoding: "utf8", flag: "wx" });

const createdFiles = [];
try {
  for (const record of affected) {
    if (record.destination === record.oldPath) continue;
    mkdirSync(path.dirname(record.destination), { recursive: true });
    writeFileSync(record.destination, record.updated, { encoding: "utf8", flag: "wx" });
    createdFiles.push(record.destination);
  }
  for (const record of affected) {
    if (record.destination === record.oldPath) writeFileSync(record.oldPath, record.updated, "utf8");
  }
  for (const record of affected) {
    if (record.destination !== record.oldPath) {
      if (!inside(sourceRoot, record.oldPath)) throw new Error("Unexpected original-file removal target.");
      unlinkSync(record.oldPath);
    }
  }
} catch (error) {
  for (const record of affected) {
    mkdirSync(path.dirname(record.oldPath), { recursive: true });
    writeFileSync(record.oldPath, record.original, "utf8");
  }
  for (const target of createdFiles) {
    if (inside(sourceRoot, target) && existsSync(target)) unlinkSync(target);
  }
  console.error(`Original source restored. Backup: ${backupDirectory}`);
  throw error;
}
console.log(`\nRelocated ${moves.size} backend files.`);
console.log(`Recovery copy: ${backupDirectory}`);
console.log("Database files, migrations, and generated Prisma code were not changed.");
console.log("No tests, builds, servers, or database operations were run.");
