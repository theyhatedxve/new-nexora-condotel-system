import {
  existsSync, mkdirSync, readFileSync, readdirSync,
  rmdirSync, unlinkSync, writeFileSync,
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
    "App.jsx", "GuestLayout.jsx", "Navbar.jsx", "Footer.jsx", "useGuestLayout.js",
    "useGuestNavigation.js", "guest-header.css", "guest-footer.css", "guest-luxury.css",
  ],
  auth: [
    "GuestAuthProvider.jsx", "GuestRoute.jsx", "useGuestAuth.js", "GuestSessionState.jsx",
    "Login.jsx", "Logout.jsx", "Register.jsx", "VerifyEmail.jsx", "useGuestLogin.js",
    "useGuestRegistration.js", "useGuestSession.js", "guestAuthApi.js",
    "guestReturnPath.js", "guest-auth.css",
  ],
  home: [
    "Home.jsx", "FeaturedRooms.jsx", "HomeStaySearch.jsx", "useFeaturedRoomImage.js",
    "useFeaturedRooms.js", "useFeaturedRoomsSection.js", "useHomeStaySearch.js",
    "homeContent.js", "home.css", "home-stay-search.css", "featured-rooms.css",
  ],
  rooms: [
    "Rooms.jsx", "RoomDetails.jsx", "RoomCard.jsx", "RoomGallery.jsx",
    "AvailabilityResults.jsx", "RoomAmenities.jsx", "RoomBrowser.jsx", "RoomCatalog.jsx",
    "RoomsSearch.jsx", "useAvailability.js", "useRoomCard.js", "useRoomDetails.js",
    "useRoomDetailsPage.js", "useRoomGallery.js", "useRoomsPage.js", "useRoomsSearch.js",
    "useRoomTypes.js", "availabilityApi.js", "roomTypesApi.js", "availabilitySearch.js",
    "availabilitySummary.js", "validateAvailabilityResults.js",
    "availabilityValidation.test.js", "availability.css", "room-details.css",
    "room-details-luxury.css", "rooms-listing.css", "rooms-luxury.css",
  ],
  booking: [
    "BookingAccess.jsx", "MyBooking.jsx", "MyBookings.jsx", "GuestCancellation.jsx",
    "MyBookingView.jsx", "SummaryRow.jsx", "useGuestBookings.js", "useMyBookingContext.js",
    "useMyBookingView.js", "usePrivateBooking.js", "accountBookingsApi.js",
    "guestReservationsApi.js", "bookingDisplayTime.js", "guestBookingFeedback.js",
    "guestBookingFeedback.test.js", "my-booking.css", "my-booking-luxury.css", "my-bookings.css",
  ],
  checkout: [
    "Checkout.jsx", "CheckoutForm.jsx", "GuestBookingReceipt.jsx", "useCheckoutForm.js",
    "useCheckoutSelection.js", "useGuestBookingReceipt.js", "useGuestCheckout.js",
    "guestBookingApi.js", "bookingAttempt.js", "bookingContext.js", "receiptDisplayTime.js",
    "checkout.css", "checkout-luxury.css", "checkout-view.css", "guest-checkout.css",
  ],
  payments: [
    "PaymentReturn.jsx", "BookingPayment.jsx", "ReturnSummary.jsx", "ReturnView.jsx",
    "useBookingPayment.js", "usePaymentReturnContext.js", "usePaymentReturnSummary.js",
    "bookingPaymentsApi.js", "payment-return.css",
  ],
  information: [
    "About.jsx", "Contact.jsx", "Policies.jsx", "usePolicyTabs.js", "aboutContent.js",
    "contactContent.js", "policies.js", "about.css", "contact.css", "policies.css",
  ],
  shared: [
    "RentalDetails.jsx", "RentalStayFields.jsx", "api.js", "formatMoney.js",
    "rentalStay.js", "rentalStay.test.js", "staySearch.js", "rental-stay.css",
    "tokens.css", "global.css",
  ],
};

const owners = new Map();
for (const [group, names] of Object.entries(groups)) {
  for (const name of names) {
    if (owners.has(name)) throw new Error(`Duplicate manifest entry: ${name}`);
    owners.set(name, group);
  }
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Review symbolic link manually: ${target}`);
      return entry.isDirectory() ? walk(target) : [target];
    });
}

function insideSource(target) {
  const relative = path.relative(sourceRoot, target);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function isAsset(target) {
  return path.relative(sourceRoot, target).split(path.sep)[0] === "assets";
}

function destinationFor(oldPath) {
  const relative = path.relative(sourceRoot, oldPath);
  if (relative === "main.jsx" || isAsset(oldPath)) return oldPath;
  const name = path.basename(oldPath);
  const group = owners.get(name);
  if (!group) throw new Error(`File is not classified: ${relative}`);
  const originalFolder = relative.split(path.sep)[0];
  const category = name.endsWith(".test.js") ? "tests" : originalFolder;
  let destination;
  if (group === "app") {
    destination = name === "App.jsx"
      ? path.join(sourceRoot, "app", name)
      : path.join(sourceRoot, "app", category, name);
  } else if (group === "shared") {
    destination = path.join(sourceRoot, "shared", category, name);
  } else if (originalFolder === "auth") {
    destination = path.join(sourceRoot, "features", "auth", name);
  } else {
    destination = path.join(sourceRoot, "features", group, category, name);
  }
  if (!insideSource(destination)) throw new Error(`Destination is outside src: ${destination}`);
  return destination;
}

if (["app", "features", "shared"].some((name) => existsSync(path.join(sourceRoot, name)))) {
  throw new Error("Target organization already exists. Do not rerun or merge automatically.");
}

const files = walk(sourceRoot);
const destinations = new Map();
const destinationSet = new Set();
for (const oldPath of files) {
  if (!isAsset(oldPath) && ![".js", ".jsx", ".css"].includes(path.extname(oldPath))) {
    throw new Error(`Review this file manually: ${oldPath}`);
  }
  const destination = destinationFor(oldPath);
  if (destinationSet.has(destination)) throw new Error(`Duplicate destination: ${destination}`);
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
  const resolved = candidates.find((candidate) => destinations.has(candidate));
  if (!resolved) {
    throw new Error(`Unresolved relative reference: ${importer} -> ${specifier}`);
  }
  return resolved;
}

const records = files.map((oldPath) => {
  const original = readFileSync(oldPath);
  const destination = destinations.get(oldPath);
  if (isAsset(oldPath)) return { oldPath, destination, original, updated: original };
  const text = original.toString("utf8");
  if (/\bimport\s*\(/.test(text) || text.includes("import.meta.glob") ||
      text.includes("import.meta.url") ||
      (path.extname(oldPath) === ".css" && /url\s*\(/i.test(text))) {
    throw new Error(`Dynamic or CSS asset references require review: ${oldPath}`);
  }
  const updated = text.replace(
    /\b(from|import)(\s*)(["'])(\.[^"'\r\n]+)\3/g,
    (match, keyword, spacing, quote, specifier) => {
      const referencedNewPath = destinations.get(resolveReference(oldPath, specifier));
      let relative = path.relative(path.dirname(destination), referencedNewPath)
        .replaceAll("\\", "/");
      if (!relative.startsWith(".")) relative = `./${relative}`;
      return `${keyword}${spacing}${quote}${relative}${quote}`;
    },
  );
  return { oldPath, destination, original, updated: Buffer.from(updated, "utf8") };
});

console.log("Guest source relocation manifest:");
for (const record of records) {
  console.log(`${path.relative(sourceRoot, record.oldPath)} -> ` +
    path.relative(sourceRoot, record.destination));
}
if (!apply) {
  console.log("\nPreview only. No files changed.");
  process.exit(0);
}

const backupDirectory = path.join(backupRoot, `guest-source-layout-${randomUUID()}`);
mkdirSync(backupDirectory, { recursive: true });
for (const record of records) {
  const target = path.join(backupDirectory, path.relative(sourceRoot, record.oldPath));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, record.original, { flag: "wx" });
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
    writeFileSync(record.destination, record.updated, { flag: "wx" });
    createdFiles.push(record.destination);
  }
  for (const record of records) {
    if (record.destination === record.oldPath && !isAsset(record.oldPath)) {
      writeFileSync(record.oldPath, record.updated);
    }
  }
  for (const record of records) {
    if (record.destination !== record.oldPath) unlinkSync(record.oldPath);
  }
} catch (error) {
  for (const record of records) {
    mkdirSync(path.dirname(record.oldPath), { recursive: true });
    writeFileSync(record.oldPath, record.original);
  }
  for (const createdFile of createdFiles) {
    if (insideSource(createdFile) && existsSync(createdFile)) unlinkSync(createdFile);
  }
  console.error(`Original files restored. Backup: ${backupDirectory}`);
  throw error;
}

function removeEmptyDirectories(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(directory, entry.name);
    if (isAsset(child)) continue;
    if (!insideSource(child)) throw new Error(`Unexpected directory: ${child}`);
    removeEmptyDirectories(child);
    if (readdirSync(child).length === 0) rmdirSync(child);
  }
}
removeEmptyDirectories(sourceRoot);
const moved = records.filter((record) => record.oldPath !== record.destination).length;
console.log(`\nRelocated ${moved} Guest source files.`);
console.log(`Recovery copy: ${backupDirectory}`);
console.log("Assets retained in their original locations.");
console.log("No tests, builds, servers, or database operations were run.");
