import { useEffect, useRef, useState } from "react";
import { searchAvailability } from "../services/availabilityApi";
import { validateSearch } from "../utils/availabilitySearch.js";

export default function useAvailabilitySearch() {
  const [checkIn, setCheckIn] = useState("");

  const [checkOut, setCheckOut] = useState("");

  const [guests, setGuests] = useState(2);

  const [results, setResults] = useState(null);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const requestRef = useRef(null);

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  function clearPreviousSearch() {
    requestRef.current?.abort();
    requestRef.current = null;
    setResults(null);
    setError("");
    setLoading(false);
  }

  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(event) {
    event.preventDefault();

    clearPreviousSearch();

    setHasSearched(false);

    const search = { checkIn, checkOut, guests };
    const validationError = validateSearch(search);

    if (validationError) {
      setError(validationError);
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    setLoading(true);

    try {
      const data = await searchAvailability(search, controller.signal);

      if (!controller.signal.aborted) {
        setResults(data);
      }

      setHasSearched(true);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(
          requestError.response?.data?.message
            ? "Unable to complete the search. Please check your dates and try again."
            : "Could not load availability. Please try again.",
        );
      }
    } finally {
      if (requestRef.current === controller) {
        setLoading(false);
        requestRef.current = null;
      }
    }
  }

  function retrySearch() {
    handleSearch({ preventDefault() {} });
  }

  function changeCheckIn(event) {
    clearPreviousSearch();
    setCheckIn(event.target.value);
  }
  function changeCheckOut(event) {
    clearPreviousSearch();
    setCheckOut(event.target.value);
  }
  function changeGuests(event) {
    clearPreviousSearch();
    setGuests(Number(event.target.value));
  }
  return {
    checkIn,
    checkOut,
    guests,
    results,
    error,
    loading,
    hasSearched,
    handleSearch,
    retrySearch,
    changeCheckIn,
    changeCheckOut,
    changeGuests,
  };
}
