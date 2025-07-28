import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function LoginAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Create admin role if it doesn't exist
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({
          user_id: data.user.id,
          role: "admin",
        });

      if (roleError) {
        console.warn("Role creation failed:", roleError);
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans l'interface administrateur.",
      });

      navigate("/admin");
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
          <p className="text-muted-foreground">Connexion administrateur</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mobile-input"
                placeholder="admin@timber.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mobile-input"
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
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground"
            >
              Connexion employé
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}