import { useRef, useState } from "react";
import { staySearchParams, validateStaySearch } from "../../../shared/utils/staySearch.js";
import { useAvailability } from "./useAvailability.js";

export default function useRoomsSearch({ query, search, onApply }) {
  const formRef = useRef(null);

  const [values, setValues] = useState(() => ({
    checkIn: query?.checkIn ?? "",
    checkOut: query?.checkOut ?? "",
    guests: String(query?.guests ?? 2),
    ...(query?.rentalType ? {
      rentalType: query.rentalType, rentalUnits: String(query.rentalUnits),
      arrivalTime: query.arrivalTime,
    } : query ? {} : {
      rentalType: "NIGHTLY", rentalUnits: "1", arrivalTime: "15:00",
    }),
  }));

  const [errors, setErrors] = useState({});

  const [revision, setRevision] = useState(0);

  const availability = useAvailability(query, revision);

  const draftMatchesApplied =
    query !== null &&
    values.checkIn === query.checkIn &&
    (values.rentalType || values.checkOut === query.checkOut) &&
    Number(values.guests) === query.guests &&
    values.rentalType === query.rentalType &&
    Number(values.rentalUnits ?? 0) === Number(query.rentalUnits ?? 0) &&
    values.arrivalTime === query.arrivalTime;

  const searchingCurrentDraft = availability.status === "loading" && draftMatchesApplied;

  function changeField(field, value) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
      ...(previous.rentalType || field === "rentalType" ? { checkOut: undefined } : {}),
      ...(field === "rentalType" ? { rentalUnits: "1", arrivalTime: previous.arrivalTime || "15:00" } : {}),
    }));

    setErrors({});
  }

  function submit(event) {
    event.preventDefault();

    const checked = validateStaySearch(values, undefined, new Date());
    setErrors(checked.errors);

    if (!checked.value) {
      const firstField = Object.keys(checked.errors)[0];

      formRef.current?.elements.namedItem(firstField)?.focus();

      return;
    }

    const nextSearch = staySearchParams(checked.value);

    if (nextSearch === search) {
      if (availability.status !== "loading") {
        setRevision((value) => value + 1);
      }

      return;
    }

    onApply(nextSearch);
  }

  function retryAvailability() {
    setRevision((value) => value + 1);
  }

  return {
    formRef,
    values,
    errors,
    retryAvailability,
    availability,
    searchingCurrentDraft,
    changeField,
    submit,
  };
}
