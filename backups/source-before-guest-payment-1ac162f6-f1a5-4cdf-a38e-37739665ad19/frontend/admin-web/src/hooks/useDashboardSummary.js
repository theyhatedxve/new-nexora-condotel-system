import { useEffect, useState } from "react";

import {
  getDashboardSummary,
  getFinancialSummary,
} from "../services/dashboardApi";

export function useDashboardSummary(role) {
  const canViewFinancial =
    ["ADMIN", "MANAGER"].includes(role);

  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const update = (key, value) => {
      if (!active) return;

      setState((current) => {
        const base =
          current?.role === role &&
          current.revision === revision
            ? current
            : {
                role,
                revision,
                operations: {
                  status: "loading",
                },
                financial: {
                  status: canViewFinancial
                    ? "loading"
                    : "hidden",
                },
              };

        return {
          ...base,
          [key]: value,
        };
      });
    };

    getDashboardSummary(controller.signal).then(
      (data) =>
        update("operations", {
          status: "ready",
          data,
        }),
      () =>
        update("operations", {
          status: "error",
        }),
    );

    if (canViewFinancial) {
      getFinancialSummary(controller.signal).then(
        (data) =>
          update("financial", {
            status: "ready",
            data,
          }),
        () =>
          update("financial", {
            status: "error",
          }),
      );
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [role, canViewFinancial, revision]);

  const current =
    state?.role === role &&
    state.revision === revision
      ? state
      : null;

  const operations =
    current?.operations ?? {
      status: "loading",
    };

  const financial = canViewFinancial
    ? current?.financial ?? {
        status: "loading",
      }
    : {
        status: "hidden",
      };

  return {
    operations,
    financial,
    loading:
      operations.status === "loading" ||
      financial.status === "loading",
    refresh: () =>
      setRevision((value) => value + 1),
  };
}