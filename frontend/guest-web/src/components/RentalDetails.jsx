import { formatPesos } from "../utils/formatMoney.js";
import { formatRentalTime, readRental, rentalCaption, RENTALS } from "../utils/rentalStay.js";
import "../styles/rental-stay.css";

export default function RentalDetails({ value }) {
  const rental = readRental(value);
  if (!rental) return null;
  const unit = RENTALS[rental.rentalType].unit;
  const rows = [
    ["Rental duration", rentalCaption(rental)],
    ["Scheduled arrival", formatRentalTime(rental.scheduledArrivalAt)],
    ["Scheduled departure", formatRentalTime(rental.scheduledDepartureAt)],
    ["Rate per " + unit, formatPesos(rental.rentalRateCentavos)],
    ["Accommodation", formatPesos(rental.accommodationCentavos)],
    ["Included guests", rental.includedOccupancy],
    ["Extra guest fee", formatPesos(rental.extraPersonFeeCentavos) + " per guest per " + unit],
    ["Extra guest charges", formatPesos(rental.extraPersonTotalCentavos)],
  ];
  if (rental.actualArrivalAt) {
    rows.push(["Actual check-in", formatRentalTime(rental.actualArrivalAt)]);
    rows.push(["Departure after check-in", formatRentalTime(rental.inventoryEndAt)]);
  }
  if (rental.actualDepartureAt) rows.push(["Actual check-out", formatRentalTime(rental.actualDepartureAt)]);
  return rows.map(([label, content]) => (
    <div className="rental-detail-row" key={label}><dt>{label}</dt><dd>{content}</dd></div>
  ));
}
