import { useEffect, useState } from "react";
import { checkBackend } from "../services/api";

export default function useBackendStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    checkBackend()
      .then((data) => {
        if (data.status === "ok") {
          setStatus("connected");
        } else {
          setStatus("offline");
        }
      })
      .catch(() => {
        setStatus("offline");
      });
  }, []);

  return { status };
}
