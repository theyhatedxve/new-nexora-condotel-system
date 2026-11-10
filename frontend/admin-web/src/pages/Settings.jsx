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
    <section className="settings-page">
      <p className="eyebrow">Administrator workspace</p>

      <h1>Settings</h1>

      <p>
        Manage the stored property information. These changes do not automatically replace
        hardcoded guest-page content.
      </p>

      <StaffDataState state={state} label="property settings" />

      {state.status === "ready" && (
        <SettingsEditor key={user.id} actorId={user.id} initial={state.data} />
      )}
    </section>
  );
}
