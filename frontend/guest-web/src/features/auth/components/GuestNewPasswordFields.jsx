export default function GuestNewPasswordFields({ prefix }) {
  return (
    <>
      <label htmlFor={`${prefix}-new-password`}>New password</label>
      <input id={`${prefix}-new-password`} name="newPassword" type="password"
        required minLength={12} maxLength={128} autoComplete="new-password"
        aria-describedby={`${prefix}-password-help`} />
      <small id={`${prefix}-password-help`}>Use 12–128 characters and a different password from your current one.</small>
      <label htmlFor={`${prefix}-confirm-password`}>Confirm new password</label>
      <input id={`${prefix}-confirm-password`} name="confirmPassword" type="password"
        required minLength={12} maxLength={128} autoComplete="new-password" />
    </>
  );
}
