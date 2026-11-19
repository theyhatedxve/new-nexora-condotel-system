import { restoreSession, signIn, signOut } from "./services/authApi.js";
import { AuthContext } from "./useAuth.js";
import useStaffSession from "./hooks/useStaffSession.js";

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
