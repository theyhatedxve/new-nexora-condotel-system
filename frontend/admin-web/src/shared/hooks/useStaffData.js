import { useEffect, useState } from "react";

export function useStaffData(loader, id) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const request =
      id === undefined
        ? loader(controller.signal)
        : loader(id, controller.signal);

    request.then(
      (data) => {
        if (active) {
          setState({
            loader,
            id,
            revision,
            status: "ready",
            data,
          });
        }
      },
      (error) => {
        if (!active) return;

        const code = error.response?.status;

        const status =
          code === 404
            ? "not-found"
            : code === 403
              ? "denied"
              : code === 409
                ? "review"
                : "error";

        setState({
          loader,
          id,
          revision,
          status,
          data: null,
        });
      },
    );

    return () => {
      active = false;
      controller.abort();
    };
  }, [loader, id, revision]);

  const current =
    state?.loader === loader &&
    state.id === id &&
    state.revision === revision
      ? state
      : {
          status: "loading",
          data: null,
        };

  return {
    ...current,
    loading: current.status === "loading",
    reload: () =>
      setRevision((value) => value + 1),
  };
}