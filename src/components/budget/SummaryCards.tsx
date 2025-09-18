import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Building } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';

interface SummaryCardsProps {
  summary: {
    totalBudget: number;
    largestCategory: {
      category: string;
      amount: number;
    } | null;
    yearOverYearChange: number;
  };
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const isPositiveChange = summary.yearOverYearChange >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      
      {/* Total Budget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatIndianCurrency(summary.totalBudget || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total allocated budget for this department
          </p>
        </CardContent>
      </Card>

      {/* Largest Spending Category */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Largest Category</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-xl font-semibold truncate">
            {summary.largestCategory?.category || 'No major category'}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.largestCategory
              ? formatIndianCurrency(summary.largestCategory.amount)
              : 'No spending data'}
          </p>
        </CardContent>
      </Card>

      {/* YoY Change */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Year-over-Year Change</CardTitle>
          {isPositiveChange ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              isPositiveChange ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositiveChange ? '+' : ''}
            {summary.yearOverYearChange?.toFixed(1) ?? '0'}%
          </div>
          <p className="text-xs text-muted-foreground">
            Compared to previous year
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryCards;
