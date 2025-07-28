import { useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/components/auth/AuthPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Clock, BarChart3, LogOut } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

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

  // Si l'utilisateur est connecté mais qu'on n'a pas encore son rôle, 
  // ou si c'est un employé, on affiche directement le dashboard employé
  if (user && (userRole === "employee" || !userRole)) {
    return <Navigate to="/employee" replace />;
  }

  if (userRole === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Cette page ne devrait jamais s'afficher car les redirections ci-dessus 
  // dirigent vers les bonnes pages selon le rôle
  return null;
};

export default Index;
