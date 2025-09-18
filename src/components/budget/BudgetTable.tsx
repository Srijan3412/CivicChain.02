import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BudgetItem {
  id: string;
  account: string;
  glcode: string;
  account_budget_a: string;
  used_amt: number;
  remaining_amt: number;
  budget_a?: number | null;
  created_at?: string;
  file_id?: string | null;
  user_id?: string | null;
}

interface BudgetTableProps {
  budgetData: BudgetItem[];
  department: string;
}

const BudgetTable: React.FC<BudgetTableProps> = ({ budgetData, department }) => {
  const { toast } = useToast();
  const [zones, setZones] = useState<string[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [loadingZones, setLoadingZones] = useState(true);

  // ✅ Fetch unique zones from budgetData
  useEffect(() => {
    try {
      setLoadingZones(true);
      const uniqueZones = Array.from(
        new Set(
          budgetData
            .map((item) => item.account)
            .filter((account) => account.toUpperCase().includes("ZONE"))
        )
      ).sort();
      setZones(uniqueZones);
    } catch (err) {
      console.error("Error fetching zones:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load zones.",
      });
    } finally {
      setLoadingZones(false);
    }
  }, [budgetData, toast]);

  // ✅ Filter budgetData based on selected zone
  const filteredBudgetData =
    selectedZone === "all"
      ? budgetData
      : budgetData.filter((item) => item.account === selectedZone);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);

  const validBudgetData = filteredBudgetData.filter(
    (item) =>
      item &&
      typeof item.account_budget_a === "string" &&
      !isNaN(Number(item.used_amt)) &&
      Number(item.used_amt) > 0
  );

  const totalUsedAmount = validBudgetData.reduce(
    (sum, item) => sum + Number(item.used_amt),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Data – {department}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* ✅ Zone Selector */}
        <div className="mb-4 space-y-2">
          <Label htmlFor="zone-select">Zone</Label>
          <Select
            value={selectedZone}
            onValueChange={setSelectedZone}
            disabled={loadingZones}
          >
            <SelectTrigger id="zone-select" className="bg-background">
              <SelectValue
                placeholder={loadingZones ? "Loading zones..." : "Select a zone"}
              />
              {loadingZones && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50 max-h-60">
              <SelectItem value="all">All Zones</SelectItem>
              {zones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableCaption>
            Municipal budget allocation by category (from municipal_budget table)
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Used Amount</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validBudgetData.length > 0 ? (
              validBudgetData.map((item) => {
                const amount = Number(item.used_amt);
                const percentage =
                  totalUsedAmount > 0
                    ? ((amount / totalUsedAmount) * 100).toFixed(1)
                    : "0.0";

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.account_budget_a}</TableCell>
                    <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                    <TableCell className="text-right">{percentage}%</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No valid budget data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default BudgetTable;
