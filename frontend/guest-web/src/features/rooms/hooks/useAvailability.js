import { useEffect, useState } from "react";
import { searchAvailability } from "../services/availabilityApi.js";
import { validateResults } from "../utils/validateAvailabilityResults.js";

export function useAvailability(query, revision) {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!query) return;

    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const results = await searchAvailability(query, controller.signal);

        if (!active) return;

        setState({
          query,
          revision,
          status: "success",
          results: validateResults(results, query),
        });
      } catch {
        if (!active) return;

        setState({
          query,
          revision,
          status: "error",
          results: [],
        });
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [query, revision]);

  if (!query) {
    return {
      status: "idle",
      results: [],
    };
  }

  if (state?.query !== query || state.revision !== revision) {
    return {
      status: "loading",
      results: [],
    };
  }

  return state;
}
