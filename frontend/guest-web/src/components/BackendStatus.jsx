import useBackendStatus from "../hooks/useBackendStatus.js";

function BackendStatus() {
  const { status } = useBackendStatus();

  return (
    <div className="backend-status">
      {status === "checking..." && <span>Checking Backend...</span>}
      {status === "connected" && (
        <span className="status-connected">● Backend Connected</span>
      )}
      {status === "offline" && <span className="status-offline">● Backend Offline</span>}
    </div>
  );
}
export default BackendStatus;
