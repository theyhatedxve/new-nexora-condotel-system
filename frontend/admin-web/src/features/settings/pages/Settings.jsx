import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import { useAuth } from "../../auth/useAuth.js";
import { useStaffData } from "../../../shared/hooks/useStaffData.js";
import { getPropertySettings } from "../services/settingsApi.js";
import { SettingsEditor } from "../components/SettingsEditor.jsx";
import "../styles/settings.css";
import "../../../shared/styles/admin-management.css";

export default function Settings() {
  const { user } = useAuth();
  const state = useStaffData(getPropertySettings);

  return (
    <section className="settings-page management-ui" aria-labelledby="settings-title">
      <header className="settings-page__heading">
        <h1 id="settings-title" className="management-ui__title">
          Settings
        </h1>
        <p>Manage property information and review operational reference values.</p>
      </header>

      <p className="settings-page__notice">
        Changes update the stored property information. They do not automatically
        replace hardcoded content on guest pages.
      </p>

      <StaffDataState state={state} label="property settings" />

      {state.status === "ready" && (
        <SettingsEditor key={user.id} actorId={user.id} initial={state.data} />
      )}
    </section>
  );
}
