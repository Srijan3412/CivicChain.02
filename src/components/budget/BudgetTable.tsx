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

// ✅ Match Supabase schema exactly
interface BudgetItem {
  id: string;
  account: string;
  glcode: string;
  account_budget_a: string;
  used_amt: number;       // numeric in DB -> number in TS
  remaining_amt: number;  // numeric in DB -> number in TS
  budget_a?: number | null; // optional since it can be NULL
  created_at?: string;    // optional timestamp from DB
  file_id?: string | null;
  user_id?: string | null;
}

interface BudgetTableProps {
  budgetData: BudgetItem[];
  department: string;
}

const BudgetTable: React.FC<BudgetTableProps> = ({ budgetData, department }) => {
  // ✅ Local helper to format INR properly
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);

  // ✅ Ensure only rows with valid numeric used_amt are displayed
  const validBudgetData = budgetData.filter(
    (item) =>
      item &&
      typeof item.account_budget_a === "string" &&
      !isNaN(Number(item.used_amt)) &&
      Number(item.used_amt) > 0
  );

  // ✅ Total used amount for percentage calculation
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
                    {/* ✅ Display account_budget_a */}
                    <TableCell className="font-medium">
                      {item.account_budget_a}
                    </TableCell>
                    {/* ✅ Display formatted INR */}
                    <TableCell className="text-right">
                      {formatCurrency(amount)}
                    </TableCell>
                    <TableCell className="text-right">{percentage}%</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground py-8"
                >
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
