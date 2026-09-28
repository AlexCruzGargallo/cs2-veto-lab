import { useSearchParams } from "react-router-dom";
import type { CompetitionFilter, FormatFilter, PeriodFilter } from "../utils/stats";

export interface AnalysisFilters {
  competition: CompetitionFilter;
  format: FormatFilter;
  period: PeriodFilter;
  // Sólo partidos con la alineación actual.
  lineup: boolean;
}

// Los filtros viven en la URL: un enlace compartido abre el análisis tal cual
// lo estabas viendo. Los valores por defecto no se escriben en la URL.
export function useAnalysisFilters() {
  const [params, setParams] = useSearchParams();

  const formatParam = params.get("format") ?? "";
  const periodParam = params.get("period");

  const filters: AnalysisFilters = {
    competition: params.get("competition") === "league" ? "league" : "all",
    format: /^bo\d+$/.test(formatParam) ? (formatParam as FormatFilter) : "all",
    period: periodParam === "3m" || periodParam === "1m" ? periodParam : "all",
    lineup: params.get("lineup") === "current",
  };

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const setFilter = <K extends keyof AnalysisFilters>(key: K, value: AnalysisFilters[K]) => {
    switch (key) {
      case "competition":
        return setParam("competition", value === "all" ? null : String(value));
      case "format":
        return setParam("format", value === "all" ? null : String(value));
      case "period":
        return setParam("period", value === "all" ? null : String(value));
      case "lineup":
        return setParam("lineup", value ? "current" : null);
    }
  };

  return { filters, setFilter, params, setParam };
}
