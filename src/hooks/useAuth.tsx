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
              console.log("Fetching user role for user:", session.user.id);
              const { data: roleData, error: roleError } = await supabase
                .from("user_roles")
                .select("role, employee_id, employees(*)")
                .eq("user_id", session.user.id)
                .single();

              console.log("Role data:", roleData, "Error:", roleError);

              if (roleData) {
                setUserRole(roleData.role);
                if (roleData.role === "employee" && roleData.employees) {
                  console.log("Setting employee data:", roleData.employees);
                  setEmployeeData(roleData.employees);
                }
              } else {
                console.log("No role data found, treating as employee");
                // Si pas de rôle trouvé, on essaie de récupérer directement l'employé
                // basé sur l'ID utilisateur ou une autre méthode
                setUserRole("employee");
              }
            } catch (error) {
              console.error("Error fetching user role:", error);
              // En cas d'erreur, on assume que c'est un employé
              setUserRole("employee");
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
            console.log("Getting session - fetching role for user:", session.user.id);
            const { data: roleData, error: roleError } = await supabase
              .from("user_roles")
              .select("role, employee_id, employees(*)")
              .eq("user_id", session.user.id)
              .single();

            console.log("Session role data:", roleData, "Error:", roleError);

            if (roleData) {
              setUserRole(roleData.role);
              if (roleData.role === "employee" && roleData.employees) {
                console.log("Setting employee data from session:", roleData.employees);
                setEmployeeData(roleData.employees);
              }
            } else {
              // Si pas de rôle dans user_roles, essayer de récupérer depuis localStorage
              const employeeId = localStorage.getItem('currentEmployeeId');
              if (employeeId) {
                console.log("Fetching employee data from localStorage ID:", employeeId);
                const { data: employee } = await supabase
                  .from("employees")
                  .select("*")
                  .eq("id", employeeId)
                  .single();
                
                if (employee) {
                  console.log("Found employee data:", employee);
                  setUserRole("employee");
                  setEmployeeData(employee);
                }
              }
            }
          } catch (error) {
            console.error("Error fetching user role from session:", error);
            // Fallback : essayer localStorage
            const employeeId = localStorage.getItem('currentEmployeeId');
            if (employeeId) {
              try {
                const { data: employee } = await supabase
                  .from("employees")
                  .select("*")
                  .eq("id", employeeId)
                  .single();
                
                if (employee) {
                  setUserRole("employee");
                  setEmployeeData(employee);
                }
              } catch (fallbackError) {
                console.error("Fallback error:", fallbackError);
              }
            }
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