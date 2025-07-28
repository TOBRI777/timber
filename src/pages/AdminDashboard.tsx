import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Eye } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

interface EmployeeSummary {
  employee_id: string;
  employee_name: string;
  total_hours: number;
  total_meals: number;
  total_km: number;
}

interface TimeEntryDetail {
  id: string;
  work_date: string;
  hours_worked: number;
  meal_taken: boolean;
  km_driven: number;
  project_name: string;
}

type Period = "day" | "week" | "month";

export default function AdminDashboard() {
  const { userRole, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<TimeEntryDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (userRole === "admin") {
      fetchEmployeeSummaries();
    }
  }, [userRole, period, selectedDate]);

  const getDateRange = () => {
    const date = new Date(selectedDate);
    
    switch (period) {
      case "day":
        return { start: selectedDate, end: selectedDate };
      case "week":
        return {
          start: format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end: format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
        };
      case "month":
        return {
          start: format(startOfMonth(date), "yyyy-MM-dd"),
          end: format(endOfMonth(date), "yyyy-MM-dd")
        };
      default:
        return { start: selectedDate, end: selectedDate };
    }
  };

  const fetchEmployeeSummaries = async () => {
    setLoading(true);
    
    try {
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          employee_id,
          hours_worked,
          meal_taken,
          km_driven,
          employees (
            first_name,
            last_name
          )
        `)
        .gte("work_date", start)
        .lte("work_date", end)
        .order("employees(first_name)");

      if (error) throw error;

      // Group by employee
      const summaryMap = new Map<string, EmployeeSummary>();
      
      data?.forEach((entry: any) => {
        const employeeId = entry.employee_id;
        const employeeName = `${entry.employees.first_name} ${entry.employees.last_name}`;
        
        if (!summaryMap.has(employeeId)) {
          summaryMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: employeeName,
            total_hours: 0,
            total_meals: 0,
            total_km: 0,
          });
        }
        
        const summary = summaryMap.get(employeeId)!;
        summary.total_hours += Number(entry.hours_worked);
        summary.total_meals += entry.meal_taken ? 1 : 0;
        summary.total_km += Number(entry.km_driven);
      });

      setEmployeeSummaries(Array.from(summaryMap.values()));
    } catch (error) {
      console.error("Error fetching summaries:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employeeId: string) => {
    setDetailsLoading(true);
    
    try {
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id,
          work_date,
          hours_worked,
          meal_taken,
          km_driven,
          projects (name)
        `)
        .eq("employee_id", employeeId)
        .gte("work_date", start)
        .lte("work_date", end)
        .order("work_date", { ascending: false });

      if (error) throw error;

      const details: TimeEntryDetail[] = data?.map((entry: any) => ({
        id: entry.id,
        work_date: entry.work_date,
        hours_worked: entry.hours_worked,
        meal_taken: entry.meal_taken,
        km_driven: entry.km_driven,
        project_name: entry.projects?.name || "Projet supprimé",
      })) || [];

      setEmployeeDetails(details);
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openEmployeeDetails = (employeeId: string, employeeName: string) => {
    setSelectedEmployee(employeeName);
    fetchEmployeeDetails(employeeId);
  };

  const getPeriodLabel = () => {
    const date = new Date(selectedDate);
    switch (period) {
      case "day":
        return format(date, "dd MMMM yyyy", { locale: fr });
      case "week":
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
        return `${format(start, "dd MMM", { locale: fr })} - ${format(end, "dd MMM yyyy", { locale: fr })}`;
      case "month":
        return format(date, "MMMM yyyy", { locale: fr });
      default:
        return "";
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (userRole !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Accès non autorisé. Vous devez être administrateur.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dashboard Administrateur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              <Button
                variant={period === "day" ? "default" : "outline"}
                onClick={() => setPeriod("day")}
              >
                Jour
              </Button>
              <Button
                variant={period === "week" ? "default" : "outline"}
                onClick={() => setPeriod("week")}
              >
                Semaine
              </Button>
              <Button
                variant={period === "month" ? "default" : "outline"}
                onClick={() => setPeriod("month")}
              >
                Mois
              </Button>
            </div>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded-md"
            />
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold">Période: {getPeriodLabel()}</h3>
          </div>

          {loading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Total heures</TableHead>
                  <TableHead>Repas</TableHead>
                  <TableHead>Km</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeSummaries.map((summary) => (
                  <TableRow key={summary.employee_id}>
                    <TableCell className="font-medium">
                      {summary.employee_name}
                    </TableCell>
                    <TableCell>{summary.total_hours.toFixed(2)}h</TableCell>
                    <TableCell>{summary.total_meals}</TableCell>
                    <TableCell>{summary.total_km.toFixed(1)}km</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEmployeeDetails(summary.employee_id, summary.employee_name)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {employeeSummaries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Aucune donnée pour cette période
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails - {selectedEmployee}</DialogTitle>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Heures</TableHead>
                  <TableHead>Repas</TableHead>
                  <TableHead>Km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeDetails.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>
                      {format(new Date(detail.work_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{detail.project_name}</TableCell>
                    <TableCell>{detail.hours_worked}h</TableCell>
                    <TableCell>
                      {detail.meal_taken ? "Oui" : "Non"}
                    </TableCell>
                    <TableCell>{detail.km_driven}km</TableCell>
                  </TableRow>
                ))}
                {employeeDetails.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Aucune entrée pour cette période
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}