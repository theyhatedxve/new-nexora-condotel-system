import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const backupRoot = fileURLToPath(new URL("../../../backups/", import.meta.url));
const apply = process.argv.includes("--apply");

if (process.argv.slice(2).some((argument) => !["--apply", "--preview"].includes(argument))) {
  throw new Error("Use --preview or --apply.");
}

const groups = {
  app: [
    "App.jsx", "AdminLayout.jsx", "AdminHeader.jsx", "AdminNotifications.jsx",
    "Sidebar.jsx", "PlaceholderPage.jsx", "useAdminLayout.js", "staffNavigation.js",
    "admin-shell.css", "admin-overlays.css",
  ],
  auth: [
    "AuthProvider.jsx", "StaffRoute.jsx", "useAuth.js", "Login.jsx", "AccessDenied.jsx",
    "StaffPassword.jsx", "useAccessDenied.js", "useStaffLogin.js", "useStaffPassword.js",
    "useStaffSession.js", "authApi.js",
  ],
  dashboard: [
    "Dashboard.jsx", "DashboardBottomGrid.jsx", "DashboardQueues.jsx",
    "useDashboardPage.js", "useDashboardSummary.js", "dashboardApi.js",
    "dashboardAttentionApi.js", "dashboardContactsApi.js", "dashboardHelpers.js",
    "dashboard.css", "dashboard-refined.css", "dashboard-bottom-grid.css",
  ],
  reservations: [
    "Reservations.jsx", "ReservationDetails.jsx", "GuestBookingStaffPanel.jsx",
    "ReservationActions.jsx", "AssignmentConfirmationDialog.jsx",
    "ReservationActionDialog.jsx", "ReservationCharges.jsx", "ReservationContacts.jsx",
    "ReservationDeposits.jsx", "ReservationFilters.jsx", "ReservationHistory.jsx",
    "ReservationOverview.jsx", "ReservationResults.jsx", "StayOperations.jsx",
    "useGuestBookingStaffPanel.js", "useReservationActions.js",
    "useReservationChargeForm.js", "useReservationCharges.js", "useReservationContacts.js",
    "useReservationDepositForm.js", "useReservationDeposits.js",
    "useReservationDetailsPage.js", "useReservationFilters.js", "useReservationResults.js",
    "useReservationsPage.js", "guestBookingStaffApi.js", "reservationChargesApi.js",
    "reservationContactsApi.js", "reservationDepositsApi.js", "reservationsApi.js",
    "stayOperationsApi.js", "guestBookingStaffPanelHelpers.js", "guestBookingStaffPanel.js",
    "reservationActions.js", "reservations.css", "reservation-workspace.css",
    "reservation-focus.css", "reservation-details.css",
  ],
  rooms: [
    "Rooms.jsx", "RoomDetails.jsx", "RoomTypes.jsx", "CreateRoomForm.jsx",
    "HousekeepingPanel.jsx", "RoomBlockManagement.jsx", "RoomChangeReview.jsx",
    "RoomManagement.jsx", "RoomTypeManagement.jsx", "RoomTypeRentalPricing.jsx",
    "CreateRoomDialog.jsx", "RoomDirectory.jsx", "RoomFilters.jsx", "RoomTypeDialogs.jsx",
    "useCreateRoomForm.js", "useRentalPricingForm.js", "useRoomBlockManagement.js",
    "useRoomChange.js", "useRoomChangeReview.js", "useRoomDetailsPage.js",
    "useRoomDirectory.js", "useRoomFilters.js", "useRoomManagement.js", "useRoomsPage.js",
    "useRoomTypeChange.js", "useRoomTypeManagement.js", "housekeepingApi.js",
    "rentalPricingApi.js", "roomsApi.js", "roomTypesApi.js", "roomTypeManagementHelpers.js",
    "rentalPricing.js", "rentalPricing.test.js", "roomManagement.js", "rooms.css",
    "room-types.css", "room-workspace.css", "rental-pricing.css",
  ],
  guests: [
    "Guests.jsx", "GuestDetails.jsx", "GuestAccounts.jsx", "GuestFilters.jsx",
    "GuestResults.jsx", "useGuestDetailsPage.js", "useGuestFilters.js", "useGuestResults.js",
    "useGuestsPage.js", "guestAccountsApi.js", "guestsApi.js", "guests.css",
    "guest-workspace.css", "guest-accounts.css",
  ],
  payments: [
    "Payments.jsx", "PaymentDetails.jsx", "PaymentReconciliation.jsx", "PaymentRefund.jsx",
    "PropertyCollection.jsx", "ReconciliationActions.jsx", "PaymentFilters.jsx",
    "QueueSection.jsx", "QueueTable.jsx", "ReconciliationQueues.jsx",
    "PaymentResults.jsx", "usePaymentDetailsPage.js", "usePaymentFilters.js",
    "usePaymentReconciliationPage.js", "usePaymentRefundForm.js", "usePaymentResults.js",
    "usePaymentsPage.js", "usePropertyCollection.js", "usePropertyCollectionForm.js",
    "useReconciliation.js", "useReconciliationActions.js", "useReconciliationQueues.js",
    "useRefund.js", "paymentsApi.js", "reconciliationApi.js", "refundsApi.js",
    "propertyCollectionHelpers.js", "reconciliationQueueRange.js", "payments.css",
    "payment-workspace.css",
  ],
  reports: [
    "Reports.jsx", "CollectionsReport.jsx", "CurrentOccupancy.jsx", "DepositReport.jsx",
    "FinancialExceptionReport.jsx", "ReportDialog.jsx", "ReportFilters.jsx",
    "useCollectionsReport.js", "useReportFilters.js", "useReportsPage.js",
    "depositReportsApi.js", "financialExceptionReportsApi.js", "reportsApi.js",
    "reports.js", "reports.css", "reports-compact.css",
  ],
  users: [
    "Users.jsx", "StaffUserEditor.jsx", "StaffUserResult.jsx", "useStaffUserChange.js",
    "staffUsersApi.js", "staff-users.css",
  ],
  settings: [
    "Settings.jsx", "PropertyValues.jsx", "SettingsEditor.jsx", "useSettingsEditor.js",
    "settingsApi.js", "settingsHelpers.js", "settings.js", "settings.css",
  ],
  audit: [
    "AuditLogs.jsx", "AuditDirectory.jsx", "AuditFilters.jsx", "useAuditDirectory.js",
    "useAuditFilters.js", "useAuditLogsPage.js", "auditApi.js", "auditLogs.js", "audit-logs.css",
  ],
  shared: [
    "AdminDisclosure.jsx", "StaffDataState.jsx", "useStaffData.js", "api.js",
    "formatters.js", "adminHelpers.test.js", "tokens.css", "global.css",
    "admin-management.css", "admin-dialogs.css",
  ],
};

const ownerByName = new Map();
for (const [group, names] of Object.entries(groups)) {
  for (const name of names) {
    if (ownerByName.has(name)) throw new Error(`Duplicate manifest entry: ${name}`);
    ownerByName.set(name, group);
  }
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symbolic links require manual review: ${target}`);
      }
      return entry.isDirectory() ? walk(target) : [target];
    });
}

function insideSource(target) {
  const relative = path.relative(sourceRoot, target);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function destinationFor(oldPath) {
  const relative = path.relative(sourceRoot, oldPath);
  const name = path.basename(oldPath);
  if (relative === "main.jsx") return oldPath;
  const group = ownerByName.get(name);
  if (!group) throw new Error(`File is not classified: ${relative}`);
  const originalFolder = relative.split(path.sep)[0];
  const category = name.endsWith(".test.js") ? "tests" : originalFolder;
  let destination;
  if (group === "app") {
    destination = name === "App.jsx" || name === "staffNavigation.js"
      ? path.join(sourceRoot, "app", name)
      : path.join(sourceRoot, "app", category, name);
  } else if (group === "shared") {
    destination = path.join(sourceRoot, "shared", category, name);
  } else if (originalFolder === "auth") {
    destination = path.join(sourceRoot, "features", "auth", name);
  } else {
    destination = path.join(sourceRoot, "features", group, category, name);
  }
  if (!insideSource(destination)) {
    throw new Error(`Destination is outside src: ${destination}`);
  }
  return destination;
}

if (["features", "shared", "app"].some((name) => existsSync(path.join(sourceRoot, name)))) {
  throw new Error("Target organization already exists. Do not rerun or merge automatically.");
}

const files = walk(sourceRoot);
const destinations = new Map();
const destinationSet = new Set();
for (const oldPath of files) {
  if (![".js", ".jsx", ".css"].includes(path.extname(oldPath))) {
    throw new Error(`Review this source asset manually: ${oldPath}`);
  }
  const destination = destinationFor(oldPath);
  if (destinationSet.has(destination)) {
    throw new Error(`Two files would use the same destination: ${destination}`);
  }
  if (destination !== oldPath && existsSync(destination)) {
    throw new Error(`Destination already exists: ${destination}`);
  }
  destinations.set(oldPath, destination);
  destinationSet.add(destination);
}

function resolveReference(importer, specifier) {
  const base = path.resolve(path.dirname(importer), specifier);
  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.css`,
    path.join(base, "index.js"), path.join(base, "index.jsx")];
  const match = candidates.find((candidate) => destinations.has(candidate));
  if (!match) {
    throw new Error(`Unresolved relative reference: ${importer} -> ${specifier}`);
  }
  return match;
}

const records = files.map((oldPath) => {
  const original = readFileSync(oldPath, "utf8");
  const destination = destinations.get(oldPath);
  if (/\bimport\s*\(/.test(original) || original.includes("import.meta.glob") ||
      original.includes("import.meta.url") ||
      (path.extname(oldPath) === ".css" && /url\s*\(/i.test(original))) {
    throw new Error(`Dynamic or asset references require manual review: ${oldPath}`);
  }
  const updated = original.replace(
    /\b(from|import)(\s*)(["'])(\.[^"'\r\n]+)\3/g,
    (match, keyword, spacing, quote, specifier) => {
      const referencedNewPath = destinations.get(resolveReference(oldPath, specifier));
      let relative = path.relative(path.dirname(destination), referencedNewPath)
        .replaceAll("\\", "/");
      if (!relative.startsWith(".")) relative = `./${relative}`;
      return `${keyword}${spacing}${quote}${relative}${quote}`;
    },
  );
  return { oldPath, destination, original, updated };
});

console.log("Admin source relocation manifest:");
for (const record of records) {
  console.log(`${path.relative(sourceRoot, record.oldPath)} -> ` +
    path.relative(sourceRoot, record.destination));
}
if (!apply) {
  console.log("\nPreview only. No files changed.");
  process.exit(0);
}

const backupDirectory = path.join(backupRoot, `admin-source-layout-${randomUUID()}`);
mkdirSync(backupDirectory, { recursive: true });
for (const record of records) {
  const backupPath = path.join(backupDirectory, path.relative(sourceRoot, record.oldPath));
  mkdirSync(path.dirname(backupPath), { recursive: true });
  writeFileSync(backupPath, record.original, { encoding: "utf8", flag: "wx" });
}
writeFileSync(path.join(backupDirectory, "relocation-manifest.json"), JSON.stringify(
  records.map(({ oldPath, destination }) => ({
    from: path.relative(sourceRoot, oldPath),
    to: path.relative(sourceRoot, destination),
  })), null, 2,
), { encoding: "utf8", flag: "wx" });

const createdFiles = [];
try {
  for (const record of records) {
    if (record.destination === record.oldPath) continue;
    mkdirSync(path.dirname(record.destination), { recursive: true });
    writeFileSync(record.destination, record.updated, { encoding: "utf8", flag: "wx" });
    createdFiles.push(record.destination);
  }
  for (const record of records) {
    if (record.destination === record.oldPath) {
      writeFileSync(record.oldPath, record.updated, "utf8");
    }
  }
  for (const record of records) {
    if (record.destination !== record.oldPath) unlinkSync(record.oldPath);
  }
} catch (error) {
  for (const record of records) {
    mkdirSync(path.dirname(record.oldPath), { recursive: true });
    writeFileSync(record.oldPath, record.original, "utf8");
  }
  for (const createdFile of createdFiles) {
    if (insideSource(createdFile) && existsSync(createdFile)) unlinkSync(createdFile);
  }
  console.error(`Original source restored. Backup: ${backupDirectory}`);
  throw error;
}

function removeEmptyDirectories(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(directory, entry.name);
    if (!insideSource(child)) throw new Error(`Unexpected directory: ${child}`);
    removeEmptyDirectories(child);
    if (readdirSync(child).length === 0) rmdirSync(child);
  }
}
removeEmptyDirectories(sourceRoot);
console.log(`\nReorganized ${records.length} source files.`);
console.log(`Recovery copy: ${backupDirectory}`);
console.log("No tests, builds, servers, or database operations were run.");
