import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { staySearchParams, validateStaySearch } from "../../../shared/utils/staySearch.js";

export default function useHomeStaySearch() {
  const navigate = useNavigate();

  const formRef = useRef(null);

  const [values, setValues] = useState({
    checkIn: "",
    rentalType: "NIGHTLY", rentalUnits: "1", arrivalTime: "15:00",
    guests: "2",
  });

  const [errors, setErrors] = useState({});

  function changeField(field, value) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
      checkOut: undefined,
      ...(field === "rentalType" ? { rentalUnits: "1" } : {}),
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

    navigate(`/rooms?${staySearchParams(checked.value)}`);
  }

  return { formRef, values, errors, changeField, submit };
}
