import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Edit2, Trash2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TimeEntry {
  id: string;
  work_date: string;
  hours_worked: number;
  meal_taken: boolean;
  km_driven: number;
  employee_id: string;
}

const EmployeeDashboard = () => {
  const { user, userRole, employeeData, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [hoursWorked, setHoursWorked] = useState("");
  const [mealTaken, setMealTaken] = useState(false);
  const [kmDriven, setKmDriven] = useState("0");
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  useEffect(() => {
    if (user && employeeData) {
      fetchTodayEntries();
    }
  }, [user, employeeData, workDate]);

  const fetchTodayEntries = async () => {
    if (!employeeData) return;
    
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("employee_id", employeeData.id)
        .eq("work_date", workDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les entrées de temps.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeData) return;

    // Validation
    const hours = parseFloat(hoursWorked);
    const km = parseFloat(kmDriven);
    
    if (isNaN(hours) || hours < 0 || hours > 24) {
      toast({
        title: "Erreur",
        description: "Les heures doivent être entre 0 et 24.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(km) || km < 0) {
      toast({
        title: "Erreur",
        description: "Les kilomètres doivent être positifs.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const entryData = {
        employee_id: employeeData.id,
        project_id: "00000000-0000-0000-0000-000000000000", // Default project ID for now
        work_date: workDate,
        hours_worked: hours,
        meal_taken: mealTaken,
        km_driven: km,
      };

      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from("time_entries")
          .update(entryData)
          .eq("id", editingEntry);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Entrée mise à jour avec succès.",
        });
      } else {
        // Create new entry
        const { error } = await supabase
          .from("time_entries")
          .insert(entryData);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Entrée ajoutée avec succès.",
        });
      }

      // Reset form
      setHoursWorked("");
      setMealTaken(false);
      setKmDriven("0");
      setEditingEntry(null);
      
      // Refresh entries
      fetchTodayEntries();
    } catch (error) {
      console.error("Error saving time entry:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'entrée.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setWorkDate(entry.work_date);
    setHoursWorked(entry.hours_worked.toString());
    setMealTaken(entry.meal_taken);
    setKmDriven(entry.km_driven.toString());
    setEditingEntry(entry.id);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) return;

    try {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Entrée supprimée avec succès.",
      });

      fetchTodayEntries();
    } catch (error) {
      console.error("Error deleting time entry:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entrée.",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setHoursWorked("");
    setMealTaken(false);
    setKmDriven("0");
    setEditingEntry(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Erreur : Données employé non trouvées</p>
          <Button className="mt-4" onClick={() => navigate("/")}>
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Timber</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin")}>
              Admin
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">
              Bonjour {employeeData.first_name} 👋
            </CardTitle>
            <p className="text-muted-foreground">Enregistrez votre journée de travail</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="workDate">Date</Label>
                <Input
                  id="workDate"
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="mt-1 mobile-input"
                />
              </div>

              <div>
                <Label htmlFor="hoursWorked">Heures travaillées</Label>
                <Input
                  id="hoursWorked"
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  className="mt-1 mobile-input"
                  placeholder="8.0"
                />
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  id="mealTaken"
                  checked={mealTaken}
                  onCheckedChange={setMealTaken}
                />
                <Label htmlFor="mealTaken" className="text-lg">Repas pris</Label>
              </div>

              <div>
                <Label htmlFor="kmDriven">Kilomètres parcourus</Label>
                <Input
                  id="kmDriven"
                  type="number"
                  step="0.1"
                  min="0"
                  value={kmDriven}
                  onChange={(e) => setKmDriven(e.target.value)}
                  className="mt-1 mobile-input"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 mobile-button"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingEntry ? "Mise à jour..." : "Sauvegarde..."}
                    </>
                  ) : (
                    editingEntry ? "Mettre à jour" : "Sauvegarder"
                  )}
                </Button>
                {editingEntry && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    className="mobile-button"
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {timeEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Entrées du {new Date(workDate).toLocaleDateString('fr-FR')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-lg">
                        {entry.hours_worked}h
                      </p>
                      <p className="text-muted-foreground">
                        {entry.meal_taken ? "Repas pris" : "Pas de repas"} • {entry.km_driven} km
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;