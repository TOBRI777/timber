import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: "employee" | "admin" | null;
  employeeData: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userRole: null,
  employeeData: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<"employee" | "admin" | null>(null);
  const [employeeData, setEmployeeData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role and employee data
          setTimeout(async () => {
            try {
              const { data: roleData } = await supabase
                .from("user_roles")
                .select("role, employee_id, employees(*)")
                .eq("user_id", session.user.id)
                .single();

              if (roleData) {
                setUserRole(roleData.role);
                if (roleData.role === "employee" && roleData.employees) {
                  setEmployeeData(roleData.employees);
                }
              }
            } catch (error) {
              console.error("Error fetching user role:", error);
            }
          }, 0);
        } else {
          setUserRole(null);
          setEmployeeData(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          try {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role, employee_id, employees(*)")
              .eq("user_id", session.user.id)
              .single();

            if (roleData) {
              setUserRole(roleData.role);
              if (roleData.role === "employee" && roleData.employees) {
                setEmployeeData(roleData.employees);
              }
            }
          } catch (error) {
            console.error("Error fetching user role:", error);
          }
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setEmployeeData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        employeeData,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}