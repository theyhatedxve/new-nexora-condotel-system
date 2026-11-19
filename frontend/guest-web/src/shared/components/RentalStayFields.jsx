import { getPhilippineToday, MAX_GUESTS } from "../utils/staySearch.js";
import { RENTALS, formatRentalTime, rentalWindow } from "../utils/rentalStay.js";
import "../styles/rental-stay.css";

export default function RentalStayFields({ values, errors, onChange, prefix }) {
  const typed = Boolean(values.rentalType);
  let departure = "";
  if (typed) {
    try { departure = formatRentalTime(rentalWindow(values).end); } catch { /* Incomplete draft. */ }
  }
  const fields = [
    { name: "checkIn", label: "Arrival date", type: "date", min: getPhilippineToday() },
    ...(typed ? [
      { name: "arrivalTime", label: "Arrival time (Philippines)", type: "time", min: "15:00", step: 60 },
      { name: "rentalUnits", label: `Number of ${RENTALS[values.rentalType].unit}s`,
        type: "number", min: 1, max: RENTALS[values.rentalType].max, step: 1 },
    ] : [{ name: "checkOut", label: "Check-out date", type: "date", min: values.checkIn || getPhilippineToday() }]),
    { name: "guests", label: "Guests", type: "number", min: 1, max: MAX_GUESTS, step: 1 },
  ];
  return (
    <div className="rental-stay-fields">
      <div className="rental-stay-field">
        <label htmlFor={prefix + "-rentalType"}>Rental type</label>
        <select id={prefix + "-rentalType"} name="rentalType"
          value={values.rentalType || ""}
          aria-invalid={Boolean(errors.rentalType)}
          aria-describedby={errors.rentalType ? prefix + "-rentalType-error" : undefined}
          onChange={(event) => onChange("rentalType", event.target.value)}>
          {!typed && <option value="">Nightly dates</option>}
          {Object.entries(RENTALS).map(([value, type]) =>
            <option key={value} value={value}>{type.label}</option>)}
        </select>
        {errors.rentalType && <p id={prefix + "-rentalType-error"} role="alert">{errors.rentalType}</p>}
      </div>
      {fields.map(({ name, label, ...attributes }) => (
        <div className="rental-stay-field" key={name}>
          <label htmlFor={prefix + "-" + name}>{label}</label>
          <input {...attributes} id={prefix + "-" + name} name={name} required
            value={values[name] ?? ""}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={errors[name] ? prefix + "-" + name + "-error" : undefined}
            onChange={(event) => onChange(name, event.target.value)} />
          {errors[name] && <p id={prefix + "-" + name + "-error"}>{errors[name]}</p>}
        </div>
      ))}
      {typed && <p className="rental-stay-departure" aria-live="polite">
        Scheduled departure {departure || "will appear after choosing a valid stay"}.
      </p>}
    </div>
  );
}
