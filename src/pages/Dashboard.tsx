import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, BarChart3, Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// NOTE: These components are placeholders to allow this file to compile.
// You need to update them to correctly display your budget data.
const SummaryCards = ({ summary }) => {
  if (!summary) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
      <CardContent>
        <p>Total Budget: {summary.totalBudget.toLocaleString()}</p>
        {summary.largestCategory && (
          <p>Largest Category: {summary.largestCategory.category} with {summary.largestCategory.amount.toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );
};
const BudgetTable = ({ budgetData, department }) => {
  if (budgetData.length === 0) return <p>No budget data available.</p>;
  return (
    <Card>
      <CardHeader><CardTitle>Budget Data - {department}</CardTitle></CardHeader>
      <CardContent>
        <p>This table needs to be updated to display the correct data fields.</p>
        {/*
          Example of how to display the data correctly:
          {budgetData.map(item => (
            <div key={item.id}>
              <p>Account: {item.account_budget_a}</p>
              <p>Allocated: {item.budget_a}</p>
              <p>Used: {item.used_amt}</p>
            </div>
          ))}
        */}
      </CardContent>
    </Card>
  );
};
const BudgetChart = ({ budgetData }) => {
  if (budgetData.length === 0) return <p>No chart data available.</p>;
  return (
    <Card>
      <CardHeader><CardTitle>Budget Chart</CardTitle></CardHeader>
      <CardContent>
        <p>This chart needs to be updated to display the correct data fields.</p>
      </CardContent>
    </Card>
  );
};
const AiInsights = ({ budgetData, department }) => {
  if (budgetData.length === 0) return <p>No AI insights available.</p>;
  return (
    <Card>
      <CardHeader><CardTitle>AI Insights</CardTitle></CardHeader>
      <CardContent>
        <p>This component needs to be updated to correctly send data to your AI function.</p>
      </CardContent>
    </Card>
  );
};
const CsvImport = () => (
  <Button disabled>
    Import CSV (placeholder)
  </Button>
);
const DepartmentSelector = ({ value, onChange }) => {
  const departments = [
    'GENERAL ADMINISTRATION (001)',
    'EDUCATION DEPT (020)',
    'CATTLE POUND HEALTH (S)',
    'FIRE DEPARTMENT (D)',
  ];
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">Select a Department</option>
      {departments.map(dept => (
        <option key={dept} value={dept}>{dept}</option>
      ))}
    </select>
  );
};
const WardSelector = ({ value, onChange }) => {
  const wards = ['all', '1', '2']; // Placeholder wards
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="all">All Wards</option>
      {wards.map(ward => (
        <option key={ward} value={ward}>{ward}</option>
      ))}
    </select>
  );
};
const YearSelector = ({ value, onChange }) => {
  const years = ['2023', '2024', '2025']; // Placeholder years
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">Select a Year</option>
      {years.map(year => (
        <option key={year} value={year}>{year}</option>
      ))}
    </select>
  );
};

// Corrected BudgetItem interface to match the database schema
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
  // NOTE: Assuming useAuth and signOut are provided by the application environment
  const { user, signOut } = {
    user: { email: "example@email.com" }, // Placeholder user object
    signOut: async () => console.log("Sign Out")
  };
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const supabaseUrl = 'https://<your-project-id>.supabase.co';
  const supabaseAnonKey = '<your-anon-key>';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        body: {
          department: department,
          ward: ward,
          year: year,
        }
      });

      if (error) {
        throw error;
      }
      
      const fetchedData = data.budgetData || [];
      setBudgetData(fetchedData);

      const totalBudget = fetchedData.reduce((sum, item) => sum + Number(item.budget_a), 0);
      const largestItem = fetchedData.length > 0 ? fetchedData[0] : null;

      const newSummary = {
        totalBudget: totalBudget,
        largestCategory: largestItem ? {
          category: largestItem.account_budget_a,
          amount: Number(largestItem.used_amt),
        } : null,
        yearOverYearChange: 0,
      };

      setSummary(newSummary);

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Budget Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user.email}</p>
          </div>
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
              <p className="text-muted-foreground">Select a department to analyze municipal budget allocation and spending patterns.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-1">
                  <DepartmentSelector value={department} onChange={setDepartment} />
                </div>
                <div className="md:col-span-1">
                  <WardSelector value={ward} onChange={setWard} />
                </div>
                <div className="md:col-span-1">
                  <YearSelector value={year} onChange={setYear} />
                </div>
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

        {/* Summary Cards */}
        {summary && (
          <div className="animate-fade-in">
            <SummaryCards summary={summary} />
          </div>
        )}

        {/* Main Content Grid */}
        {budgetData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 animate-fade-in">
            <BudgetTable budgetData={budgetData} department={department} />
            <BudgetChart budgetData={budgetData} />
          </div>
        )}

        {/* AI Insights */}
        <div className="animate-fade-in">
          <AiInsights budgetData={budgetData} department={department} />
        </div>

        {/* Empty State */}
        {!summary && !loading && (
          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Ready to Explore Budget Data?</h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto mb-6">
                Select a department from the dropdown above and click "Analyze Budget" to view detailed financial insights and visualizations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" size="lg" className="hover-scale">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Sample Data
                </Button>
                <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90">
                  <Link to="/insights">
                    <Brain className="mr-2 h-4 w-4" />
                    Try AI Insights
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
