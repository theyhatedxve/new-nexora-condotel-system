import { useAuth } from "../useAuth.js";
import { isStaff } from "../../../app/staffNavigation.js";

export default function useAccessDenied() {
  const { user, signOut } = useAuth();

  const Container = isStaff(user?.role) ? "section" : "main";

  function signOutStaff() {
    return void signOut();
  }

  return { user, Container, signOutStaff };
}
