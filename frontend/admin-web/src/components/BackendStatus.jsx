
import { useEffect, useState } from "react";
import { checkBackend } from "../services/api";

function BackendStatus() {
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

  return (
    <div className="backend-status">
      {status === "checking" && (
        <span>Checking Backend...</span>
      )}

      {status === "connected" && (
        <span className="status-connected">
          ● Backend Connected
        </span>
      )}

      {status === "offline" && (
        <span className="status-offline">
          ● Backend Offline
        </span>
      )}
    </div>
  );
}

export default BackendStatus;
