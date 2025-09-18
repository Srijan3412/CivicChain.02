import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, BarChart3, Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ✅ Add Helmet to manage <head> tags dynamically
import { Helmet } from 'react-helmet';

// --- Rest of your placeholder components here (SummaryCards, BudgetTable, etc.) ---

// Corrected BudgetItem interface
interface BudgetItem {
  id: string;
  account: string;
  glcode: string;
  budget_a: number;
  used_amt: number;
  remaining_amt: number;
  account_budget_a: string;
}

interface BudgetSummary {
  totalBudget: number;
  largestCategory: {
    category: string;
    amount: number;
  } | null;
  yearOverYearChange: number;
}

const Dashboard = () => {
  const [department, setDepartment] = useState('');
  const [ward, setWard] = useState('all');
  const [year, setYear] = useState('');
  const [budgetData, setBudgetData] = useState<BudgetItem[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const { user, signOut } = {
    user: { email: "example@email.com" },
    signOut: async () => console.log("Sign Out")
  };
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const fetchBudgetData = async () => {
    if (!department) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a department.",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-budget', {
        body: { department, ward, year }
      });

      if (error) throw error;

      const fetchedData = data.budgetData || [];
      setBudgetData(fetchedData);

      const totalBudget = fetchedData.reduce((sum, item) => sum + Number(item.budget_a), 0);
      const largestItem = fetchedData.length > 0 ? fetchedData[0] : null;

      setSummary({
        totalBudget,
        largestCategory: largestItem
          ? { category: largestItem.account_budget_a, amount: Number(largestItem.used_amt) }
          : null,
        yearOverYearChange: 0,
      });

      toast({
        title: "Data Loaded",
        description: `Found ${fetchedData.length} budget items for ${department}.`,
      });
    } catch (error) {
      console.error('Error fetching budget data:', error);
      toast({
        variant: "destructive",
        title: "Fetch Failed",
        description: "Failed to fetch budget data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) return null;

  return (
    <>
      {/* ✅ Helmet adds favicon suppression globally */}
      <Helmet>
        <link rel="icon" href="data:;base64,iVBORw0KGgo=" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Budget Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user.email}</p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Controls */}
          <div className="mb-8">
            <Card className="bg-gradient-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  Budget Data Explorer
                </CardTitle>
                <p className="text-muted-foreground">
                  Select a department to analyze municipal budget allocation and spending patterns.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  {/* Your department / ward / year selectors */}
                  {/* ... */}
                  <div className="md:col-span-1">
                    <Button
                      onClick={fetchBudgetData}
                      disabled={loading || !department}
                      className="w-full bg-gradient-primary hover:opacity-90 shadow-md"
                      size="lg"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Search className="mr-2 h-4 w-4" />
                      {loading ? 'Loading...' : 'Analyze Budget'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary, Chart, AI Insights and Empty State follow as in your code */}
        </main>
      </div>
    </>
  );
};

export default Dashboard;
