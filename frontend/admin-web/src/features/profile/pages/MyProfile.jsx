import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import { ROLE_LABELS } from "../../../app/staffNavigation.js";
import useStaffProfile from "../hooks/useStaffProfile.js";

function PasswordField({ label, name, isNew = false }) {
  return (
    <label className="staff-profile__field">
      <span>{label}</span>
      <input name={name} type="password" required minLength={isNew ? 12 : 1}
        maxLength={128} autoComplete={isNew ? "new-password" : "current-password"} />
    </label>
  );
}

export default function MyProfile() {
  const flow = useStaffProfile();
  const profile = flow.resource.status === "ready" ? flow.resource.data : null;
  const disabled = flow.busy || flow.unknown;

  return (
    <section className="staff-profile" aria-labelledby="my-profile-title" aria-busy={flow.busy}>
      <header className="staff-profile__heading">
        <div>
          <h1 id="my-profile-title">My Profile</h1>
          <p>Manage your personal details and sign-in information.</p>
        </div>
        <button type="button" className="staff-profile__secondary" onClick={flow.reload}
          disabled={flow.busy || flow.resource.loading}>Reload profile</button>
      </header>

      {flow.feedback && (
        <p className="staff-profile__feedback" data-error={flow.feedback.error}
          role={flow.feedback.error ? "alert" : "status"}>{flow.feedback.text}</p>
      )}
      <StaffDataState state={flow.resource} label="Your profile" />

      {profile && (
        <div key={`${profile.id}:${profile.updatedAt}`}>
          <section className="staff-profile__card">
            <header>
              <h2>Personal details</h2>
              <p>{ROLE_LABELS[profile.role]} · {profile.email}</p>
            </header>
            <form onSubmit={(event) => void flow.submit(event, "details")}>
              <fieldset disabled={disabled}>
                <legend className="staff-profile__sr-only">Personal details</legend>
                <div className="staff-profile__grid">
                  <label className="staff-profile__field">
                    <span>Full name</span>
                    <input name="name" required maxLength={100} autoComplete="name" defaultValue={profile.name} />
                  </label>
                  <label className="staff-profile__field">
                    <span>Phone number</span>
                    <input name="phone" type="tel" maxLength={30} autoComplete="tel" defaultValue={profile.phone} />
                  </label>
                </div>
                <label className="staff-profile__field">
                  <span>Address</span>
                  <textarea name="address" rows={3} maxLength={300} autoComplete="street-address"
                    defaultValue={profile.address} />
                </label>
                <button className="staff-profile__primary" type="submit">
                  {flow.busy ? "Please wait..." : "Save personal details"}
                </button>
              </fieldset>
            </form>
          </section>

          <h2 className="staff-profile__security-title">Sign-in security</h2>
          <p>Email and password changes end all existing sessions.</p>

          <details className="staff-profile__card">
            <summary>Change sign-in email</summary>
            <form onSubmit={(event) => void flow.submit(event, "email")}>
              <fieldset disabled={disabled}>
                <legend className="staff-profile__sr-only">Change sign-in email</legend>
                <label className="staff-profile__field">
                  <span>New email</span>
                  <input name="email" type="email" required maxLength={254} autoComplete="email"
                    defaultValue={profile.email} />
                </label>
                <PasswordField name="currentPassword" label="Current password" />
                <button className="staff-profile__primary" type="submit">Change email and sign out</button>
              </fieldset>
            </form>
          </details>

          <details className="staff-profile__card">
            <summary>Change password</summary>
            <form onSubmit={(event) => void flow.submit(event, "password")}>
              <fieldset disabled={disabled}>
                <legend className="staff-profile__sr-only">Change password</legend>
                <PasswordField name="currentPassword" label="Current password" />
                <div className="staff-profile__grid">
                  <PasswordField name="newPassword" label="New password" isNew />
                  <PasswordField name="confirmPassword" label="Confirm new password" isNew />
                </div>
                <p>Use 12–128 characters and a different password.</p>
                <button className="staff-profile__primary" type="submit">Change password and sign out</button>
              </fieldset>
            </form>
          </details>
        </div>
      )}
    </section>
  );
}
