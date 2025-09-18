import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ZoneSelectorProps {
  value: string;
  onChange: (value: string) => void;
  data: Array<{ account: string; glcode: string; account_budget_a: string; budget_a: number; used_amt: number; remaining_amt: number }>;
}

const ZoneSelector: React.FC<ZoneSelectorProps> = ({ value, onChange, data }) => {
  const [zones, setZones] = useState<string[]>([]);

  useEffect(() => {
    // Extract unique accounts containing "ZONE"
    const zoneAccounts = Array.from(
      new Set(
        data
          .filter(item => item.account.toUpperCase().includes('ZONE'))
          .map(item => item.account)
      )
    );
    setZones(zoneAccounts);
  }, [data]);

  return (
    <div className="space-y-2">
      <Label htmlFor="zone-select">Zone</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="zone-select" className="bg-background">
          <SelectValue placeholder="Select a zone" />
        </SelectTrigger>
        <SelectContent className="bg-background border border-border z-50">
          <SelectItem value="all">All Zones</SelectItem>
          {zones.map((zone, idx) => (
            <SelectItem key={idx} value={zone}>
              {zone}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ZoneSelector;
