import { useAuth } from "../auth/useAuth";
import { isStaff } from "../auth/staffNavigation";

export default function useAccessDenied() {
  const { user, signOut } = useAuth();

  const Container = isStaff(user?.role) ? "section" : "main";

  function signOutStaff() {
    return void signOut();
  }

  return { user, Container, signOutStaff };
}
