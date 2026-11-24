import { useGuestAuth } from "../useGuestAuth.js";
import useGuestCredentialAction from "../hooks/useGuestCredentialAction.js";
import { changeGuestPassword, requestGuestEmailChange } from "../services/guestCredentialsApi.js";
import GuestCredentialFeedback from "../components/GuestCredentialFeedback.jsx";
import GuestNewPasswordFields from "../components/GuestNewPasswordFields.jsx";
import "../styles/guest-auth.css";

export default function AccountSecurity() {
  const auth = useGuestAuth();
  const password = useGuestCredentialAction();
  const email = useGuestCredentialAction();
  const pending = password.pending || email.pending;

  function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form));
    void password.run(async () => { await changeGuestPassword(input); form.reset(); });
  }

  function changeEmail(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form));
    void email.run(async () => {
      const message = await requestGuestEmailChange(input);
      form.reset();
      return message;
    });
  }

  return (
    <section className="guest-auth" aria-labelledby="guest-security-title">
      <header className="guest-auth__heading">
        <p className="guest-auth__eyebrow">My account</p>
        <h1 id="guest-security-title">Account security</h1>
        <p>Signed in as {auth.user.email}</p>
      </header>
      <div className="guest-auth__card">
        <h2>Change password</h2>
        <p>Changing your password signs out all your existing sessions.</p>
        <form onSubmit={changePassword}>
          <fieldset disabled={pending}>
            <legend>Choose a new password</legend>
            <label htmlFor="security-current-password">Current password</label>
            <input id="security-current-password" name="currentPassword" type="password"
              required maxLength={1024} autoComplete="current-password" />
            <GuestNewPasswordFields prefix="security" />
            <button type="submit">Change password and sign out</button>
          </fieldset>
        </form>
        <GuestCredentialFeedback state={password} />
      </div>
      <div className="guest-auth__card guest-auth__security-card">
        <h2>Change sign-in email</h2>
        <p>Your current email stays active until you confirm the link sent to your new address. Confirmation signs out all your existing sessions.</p>
        <p>This changes your account login only. Booking contact details stay the same.</p>
        <form onSubmit={changeEmail}>
          <fieldset disabled={pending}>
            <legend>Verify a new email address</legend>
            <label htmlFor="security-new-email">New email</label>
            <input id="security-new-email" name="email" type="email" required maxLength={254} autoComplete="email" />
            <label htmlFor="security-email-password">Current password</label>
            <input id="security-email-password" name="currentPassword" type="password"
              required maxLength={1024} autoComplete="current-password" />
            <button type="submit">Send confirmation link</button>
          </fieldset>
        </form>
        <GuestCredentialFeedback state={email} />
      </div>
    </section>
  );
}
