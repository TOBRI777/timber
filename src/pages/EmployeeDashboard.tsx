import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";

interface TimeEntry {
  id: string;
  work_date: string;
  hours_worked: number;
  meal_taken: boolean;
  km_driven: number;
  project_id: string;
  projects: { name: string } | null;
}

export default function EmployeeDashboard() {
  const { employeeData, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [workDate, setWorkDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hoursWorked, setHoursWorked] = useState("");
  const [mealTaken, setMealTaken] = useState(false);
  const [kmDriven, setKmDriven] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  useEffect(() => {
    if (employeeData?.id) {
      fetchProjects();
      fetchTodayEntries();
    }
  }, [employeeData, workDate]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .order("name");
    
    if (data) {
      setProjects(data);
      if (data.length > 0 && !projectId) {
        setProjectId(data[0].id);
      }
    }
  };

  const fetchTodayEntries = async () => {
    if (!employeeData?.id) return;
    
    const { data } = await supabase
      .from("time_entries")
      .select(`
        id, work_date, hours_worked, meal_taken, km_driven, project_id,
        projects (name)
      `)
      .eq("employee_id", employeeData.id)
      .eq("work_date", workDate)
      .order("created_at", { ascending: false });
    
    if (data) {
      setTimeEntries(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeData?.id) return;

    const hours = parseFloat(hoursWorked);
    const km = parseFloat(kmDriven) || 0;

    if (hours <= 0 || hours > 24) {
      toast({
        title: "Erreur",
        description: "Les heures doivent être entre 0 et 24",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from("time_entries")
          .update({
            hours_worked: hours,
            meal_taken: mealTaken,
            km_driven: km,
            project_id: projectId,
          })
          .eq("id", editingEntry);

        if (error) throw error;
        
        toast({ title: "Entrée mise à jour avec succès" });
        setEditingEntry(null);
      } else {
        // Create new entry
        const { error } = await supabase
          .from("time_entries")
          .insert({
            employee_id: employeeData.id,
            project_id: projectId,
            work_date: workDate,
            hours_worked: hours,
            meal_taken: mealTaken,
            km_driven: km,
          });

        if (error) throw error;
        
        toast({ title: "Journée enregistrée avec succès" });
      }

      // Reset form
      setHoursWorked("");
      setMealTaken(false);
      setKmDriven("");
      fetchTodayEntries();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setHoursWorked(entry.hours_worked.toString());
    setMealTaken(entry.meal_taken);
    setKmDriven(entry.km_driven.toString());
    setProjectId(entry.project_id);
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
      
      toast({ title: "Entrée supprimée" });
      fetchTodayEntries();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setHoursWorked("");
    setMealTaken(false);
    setKmDriven("");
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="text-center">
        <p>Erreur: Données employé non trouvées</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ma journée - {employeeData.first_name} {employeeData.last_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Projet</Label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Sélectionner un projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Heures travaillées</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0"
                max="24"
                placeholder="8.0"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="meal"
                checked={mealTaken}
                onCheckedChange={setMealTaken}
              />
              <Label htmlFor="meal">Repas pris ?</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="km">Kilomètres</Label>
              <Input
                id="km"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={kmDriven}
                onChange={(e) => setKmDriven(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingEntry ? "Mise à jour..." : "Enregistrement..."}
                  </>
                ) : (
                  editingEntry ? "Mettre à jour" : "Enregistrer"
                )}
              </Button>
              {editingEntry && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
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
            <CardTitle>Entrées du {format(new Date(workDate), "dd/MM/yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{entry.projects?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.hours_worked}h - {entry.meal_taken ? "Repas pris" : "Pas de repas"} - {entry.km_driven}km
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(entry)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}