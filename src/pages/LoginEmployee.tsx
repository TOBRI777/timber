import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function LoginEmployee() {
  const [accessCode, setAccessCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify company access code
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("access_code", accessCode)
        .single();

      if (companyError || !company) {
        toast({
          title: "Code d'accès invalide",
          description: "Vérifiez votre code d'accès.",
          variant: "destructive",
        });
        return;
      }

      // Find or create employee
      let { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", company.id)
        .eq("first_name", firstName)
        .single();

      if (employeeError && employeeError.code === "PGRST116") {
        // Employee doesn't exist, create one
        const { data: newEmployee, error: createError } = await supabase
          .from("employees")
          .insert({
            company_id: company.id,
            first_name: firstName,
            last_name: "",
            access_code: `EMP${Date.now()}`,
          })
          .select()
          .single();

        if (createError) {
          toast({
            title: "Erreur",
            description: "Impossible de créer l'employé.",
            variant: "destructive",
          });
          return;
        }
        employee = newEmployee;
      } else if (employeeError) {
        toast({
          title: "Erreur",
          description: "Erreur lors de la recherche de l'employé.",
          variant: "destructive",
        });
        return;
      }

      // Create anonymous session for employee
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError) {
        toast({
          title: "Erreur d'authentification",
          description: authError.message,
          variant: "destructive",
        });
        return;
      }

      // Store employee role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "employee",
          employee_id: employee.id,
        });

      if (roleError) {
        console.warn("Role creation failed:", roleError);
      }

      // Store employee ID for session
      localStorage.setItem("currentEmployeeId", employee.id);

      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${employee.first_name}!`,
      });

      navigate("/employee");
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Timber</CardTitle>
          <p className="text-muted-foreground">Connexion employé</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="accessCode">Code d'accès</Label>
              <Input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="mobile-input"
                placeholder="TIMBER2024"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mobile-input"
                placeholder="Pierre"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full mobile-button"
              disabled={loading}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => navigate("/admin")}
              className="text-sm text-muted-foreground"
            >
              Connexion administrateur
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}