// hooks/useRanking.ts

import { useCallback, useEffect, useState } from "react";
import type { RankingResponse } from "../types/ranking";

interface UseRankingResult {
  data: RankingResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const API_URL = "http://127.0.0.1:18000/api/v1/ranking";

export function useRanking(): UseRankingResult {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json: RankingResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  return { data, loading, error, refetch: fetchRanking };
}