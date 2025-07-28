import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function EmployeeLoginForm() {
  const [accessCode, setAccessCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Vérifier si l'employé existe avec ce code d'accès
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .eq("access_code", accessCode)
        .eq("active", true)
        .single();

      if (employeeError || !employee) {
        toast({
          title: "Erreur",
          description: "Code d'accès invalide ou employé inactif",
          variant: "destructive",
        });
        return;
      }

      // Vérifier si le prénom correspond
      if (employee.first_name.toLowerCase() !== firstName.toLowerCase()) {
        toast({
          title: "Erreur",
          description: "Le prénom ne correspond pas à ce code d'accès",
          variant: "destructive",
        });
        return;
      }

      // Créer une session anonyme
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        toast({
          title: "Erreur d'authentification",
          description: authError.message,
          variant: "destructive",
        });
        return;
      }

      // Créer le rôle d'employé - avec gestion d'erreur RLS améliorée
      try {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "employee",
            employee_id: employee.id,
          });

        if (roleError) {
          console.error("Role creation error:", roleError);
          // Même si la création du rôle échoue, on continue car l'authentification a réussi
          // Le hook useAuth gérera le fait qu'il n'y a pas de rôle
        }
      } catch (error) {
        console.error("Error creating user role:", error);
        // On continue même en cas d'erreur
      }

      // Stocker l'ID de l'employé pour récupération ultérieure
      localStorage.setItem('currentEmployeeId', employee.id);

      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${employee.first_name} ${employee.last_name}!`,
      });

      // Redirection vers la page principale - elle redirigera vers /employee
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="accessCode">Code d'accès</Label>
        <Input
          id="accessCode"
          type="text"
          placeholder="EMP001"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          required
          className="h-12 text-lg"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="firstName">Prénom</Label>
        <Input
          id="firstName"
          type="text"
          placeholder="Jean"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="h-12 text-lg"
        />
      </div>
      <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connexion...
          </>
        ) : (
          "Se connecter"
        )}
      </Button>
    </form>
  );
}