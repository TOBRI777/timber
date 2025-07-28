import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeLoginForm } from "./EmployeeLoginForm";
import { AdminLoginForm } from "./AdminLoginForm";

export function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Timber</CardTitle>
          <CardDescription>Système de gestion du temps</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="employee" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employee">Employé</TabsTrigger>
              <TabsTrigger value="admin">Patron</TabsTrigger>
            </TabsList>
            <TabsContent value="employee" className="space-y-4">
              <EmployeeLoginForm />
            </TabsContent>
            <TabsContent value="admin" className="space-y-4">
              <AdminLoginForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}