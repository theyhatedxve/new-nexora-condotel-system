import { restoreSession, signIn, signOut } from "../services/authApi";
import { AuthContext } from "./useAuth";
import useStaffSession from "../hooks/useStaffSession.js";

export function AuthProvider({ children }) {
  const { session } = useStaffSession();

  return (
    <AuthContext.Provider
      value={{
        ...session,
        signIn,
        signOut,
        retry: restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
