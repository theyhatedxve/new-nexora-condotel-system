import StaffDataState from "../components/StaffDataState";
import { useAuth } from "../auth/useAuth";
import { useStaffData } from "../hooks/useStaffData";
import { getPropertySettings } from "../services/settingsApi";
import { SettingsEditor } from "../components/settings/SettingsEditor.jsx";
import "../styles/settings.css";

export default function Settings() {
  const { user } = useAuth();
  const state = useStaffData(getPropertySettings);

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <header className="settings-page__heading">
        <h1 id="settings-title">Settings</h1>
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
