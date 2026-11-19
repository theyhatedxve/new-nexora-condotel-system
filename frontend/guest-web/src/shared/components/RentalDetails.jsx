import { formatPesos } from "../utils/formatMoney.js";
import { formatRentalTime, readRental, rentalCaption, RENTALS } from "../utils/rentalStay.js";
import "../styles/rental-stay.css";

export default function RentalDetails({ value }) {
  const rental = readRental(value);
  if (!rental) return null;
  const unit = RENTALS[rental.rentalType].unit;
  const rows = [
    ["Original rental duration", rentalCaption(rental)],
    ["Originally scheduled arrival", formatRentalTime(rental.scheduledArrivalAt)],
    ["Originally scheduled departure", formatRentalTime(rental.scheduledDepartureAt)],
    ["Booked rate per " + unit, formatPesos(rental.rentalRateCentavos)],
    ["Original accommodation", formatPesos(rental.accommodationCentavos)],
    ["Included guests", rental.includedOccupancy],
    ["Extra guest fee", formatPesos(rental.extraPersonFeeCentavos) + " per guest per " + unit],
    ["Original extra guest charges", formatPesos(rental.extraPersonTotalCentavos)],
  ];
  if (rental.actualArrivalAt) {
    rows.push(["Actual check-in", formatRentalTime(rental.actualArrivalAt)]);
    rows.push(["Current departure recorded by hotel", formatRentalTime(rental.inventoryEndAt)]);
  }
  if (rental.actualDepartureAt) rows.push(["Actual check-out", formatRentalTime(rental.actualDepartureAt)]);
  return rows.map(([label, content]) => (
    <div className="rental-detail-row" key={label}><dt>{label}</dt><dd>{content}</dd></div>
  ));
}
