import { useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/components/auth/AuthPage";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading, userRole, employeeData } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Timber</h1>
          <p className="text-muted-foreground">
            {userRole === "employee" 
              ? `Bienvenue ${employeeData?.first_name} ${employeeData?.last_name}`
              : "Tableau de bord administrateur"
            }
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-lg mb-4">
            {userRole === "employee" 
              ? "Interface mobile employé en cours de développement..."
              : "Interface admin en cours de développement..."
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
