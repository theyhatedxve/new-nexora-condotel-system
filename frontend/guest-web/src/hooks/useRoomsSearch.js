import { useRef, useState } from "react";
import { staySearchParams, validateStaySearch } from "../utils/staySearch.js";
import { useAvailability } from "./useAvailability.js";

export default function useRoomsSearch({ query, search, onApply }) {
  const formRef = useRef(null);

  const [values, setValues] = useState(() => ({
    checkIn: query?.checkIn ?? "",
    checkOut: query?.checkOut ?? "",
    guests: String(query?.guests ?? 2),
  }));

  const [errors, setErrors] = useState({});

  const [revision, setRevision] = useState(0);

  const availability = useAvailability(query, revision);

  const draftMatchesApplied =
    query !== null &&
    values.checkIn === query.checkIn &&
    values.checkOut === query.checkOut &&
    Number(values.guests) === query.guests;

  const searchingCurrentDraft = availability.status === "loading" && draftMatchesApplied;

  function changeField(field, value) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors({});
  }

  function submit(event) {
    event.preventDefault();

    const checked = validateStaySearch(values);
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
