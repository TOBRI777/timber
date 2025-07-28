import { useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/components/auth/AuthPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Clock, BarChart3, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const { user, loading, userRole, employeeData, signOut } = useAuth();

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
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Timber</h1>
            <p className="text-muted-foreground">
              {userRole === "employee" 
                ? `Bienvenue ${employeeData?.first_name} ${employeeData?.last_name}`
                : "Tableau de bord administrateur"
              }
            </p>
          </div>
          <Button onClick={signOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {userRole === "employee" && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Saisir ma journée
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Enregistrez vos heures, repas et kilomètres parcourus
                </p>
                <Button asChild className="w-full">
                  <Link to="/employee">Commencer</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {userRole === "admin" && (
            <>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Dashboard Admin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Consultez les rapports et statistiques des employés
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/admin/dashboard">Accéder</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Saisir une journée
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Enregistrer des heures pour un employé
                  </p>
                  <Button asChild className="w-full" variant="outline">
                    <Link to="/employee">Accéder</Link>
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
