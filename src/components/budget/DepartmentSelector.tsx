import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


interface ZoneSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ZoneSelector: React.FC<ZoneSelectorProps> = ({ value, onChange }) => {
  const [zones, setZones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('municipal_budget')
        .select('account')
        .not('account', 'is', null);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data) {
        setZones([]);
        return;
      }

      // Filter accounts containing "ZONE" and get unique values
      const uniqueZones = Array.from(
        new Set(
          data
            .map((item: any) => item.account)
            .filter((account: string) => account.toUpperCase().includes('ZONE'))
        )
      ).sort();

      setZones(uniqueZones);
    } catch (err) {
      console.error('Error fetching zones:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load zones. Please try again.",
      });
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="zone-select">Zone</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger id="zone-select" className="bg-background">
          <SelectValue placeholder={loading ? "Loading zones..." : "Select a zone"} />
          {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        </SelectTrigger>
        <SelectContent className="bg-background border border-border z-50 max-h-60">
          {zones.length === 0 && !loading ? (
            <div className="p-2 text-sm text-muted-foreground">No zones found</div>
          ) : (
            zones.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ZoneSelector;
