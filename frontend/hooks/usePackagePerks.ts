'use client';

import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '@/utils/api';

export interface PackagePerk {
  enabled: boolean;
  description: string;
  type?: string;
  limit?: string | number;
  access?: string;
  frequency?: string;
  sessionsPerMonth?: number | string;
  responseTime?: string;
}

export interface PackagePerksData {
  hasPackage: boolean;
  packageName: string | null;
  packagePrice: number | null;
  perks: Record<string, PackagePerk>;
  enabledPerks: string[];
  subscriptionDate?: string;
  isAdmin?: boolean;
  message?: string;
}

export function usePackagePerks() {
  const [perksData, setPerksData] = useState<PackagePerksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setPerksData({
          hasPackage: false,
          packageName: null,
          packagePrice: null,
          perks: {},
          enabledPerks: []
        });
        setLoading(false);
        return;
      }

      // IMPORTANT: Use same-origin Next.js API proxy so local/dev + prod both work,
      // instead of buildApiUrl() which may point at production domain.
      const response = await fetch('/api/package-perks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // If it's a 404 or other error, log it but still try to parse the response
        const errorText = await response.text();
        console.error('Package perks API error:', response.status, errorText);
        
        // Try to parse as JSON in case it's a structured error
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.hasPackage !== undefined) {
            // If the response has hasPackage field, use it
            setPerksData(errorData);
            return;
          }
        } catch {
          // Not JSON, continue with error
        }
        
        throw new Error(`Failed to fetch package perks: ${response.status}`);
      }

      const data = await response.json();
      setPerksData(data);
    } catch (err) {
      console.error('Error fetching package perks:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPerksData({
        hasPackage: false,
        packageName: null,
        packagePrice: null,
        perks: {},
        enabledPerks: []
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPerkAccess = useCallback(async (perkName: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const response = await fetch(`/api/package-perks/check/${perkName}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.hasAccess === true;
    } catch (err) {
      console.error('Error checking perk access:', err);
      return false;
    }
  }, []);

  const hasPerk = useCallback((perkName: string): boolean => {
    if (!perksData) return false;
    if (perksData.isAdmin) return true; // Admins have all perks
    return perksData.enabledPerks.includes(perkName);
  }, [perksData]);

  useEffect(() => {
    fetchPerks();
  }, [fetchPerks]);

  return {
    perksData,
    loading,
    error,
    hasPerk,
    checkPerkAccess,
    refreshPerks: fetchPerks
  };
}
