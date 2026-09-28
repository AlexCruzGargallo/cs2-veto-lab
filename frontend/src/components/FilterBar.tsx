import { Box, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import type { AnalysisFilters } from "../hooks/useAnalysisFilters";
import { colors } from "../themes/tokens";

type FilterBarProps = {
  filters: AnalysisFilters;
  setFilter: <K extends keyof AnalysisFilters>(key: K, value: AnalysisFilters[K]) => void;
  hasLeague: boolean;
  // Formatos disponibles (BO1, BO2...). Sin ellos no se muestra ese filtro.
  formats?: number[];
  // Sin él no se muestra el filtro de alineación actual.
  lineupAvailable?: boolean;
};

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

export default function FilterBar({ filters, setFilter, hasLeague, formats, lineupAvailable }: FilterBarProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: { xs: 1.5, md: 2.5 },
        px: 2,
        py: 1.25,
        mb: 2.5,
        borderRadius: 3,
        border: `1px solid ${colors.border}`,
        bgcolor: "rgba(26,32,44,0.6)",
      }}
    >
      <Group label="Competition">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filters.competition}
          onChange={(_, v) => v && setFilter("competition", v)}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="league" disabled={!hasLeague}>
            ESEA
          </ToggleButton>
        </ToggleButtonGroup>
      </Group>

      <Group label="Period">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filters.period}
          onChange={(_, v) => v && setFilter("period", v)}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="3m">3 months</ToggleButton>
          <ToggleButton value="1m">1 month</ToggleButton>
        </ToggleButtonGroup>
      </Group>

      {formats && formats.length > 0 && (
        <Group label="Format">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filters.format}
            onChange={(_, v) => v && setFilter("format", v)}
          >
            <ToggleButton value="all">All</ToggleButton>
            {formats.map((bo) => (
              <ToggleButton key={bo} value={`bo${bo}`}>
                BO{bo}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Group>
      )}

      <Box sx={{ display: "flex", gap: 1, ml: { lg: "auto" }, flexWrap: "wrap" }}>
        {lineupAvailable && (
          <Tooltip title="Only matches where at least 4 of the current 5 players played">
            <FormControlLabel
              sx={{ mr: 0 }}
              control={
                <Switch size="small" checked={filters.lineup} onChange={(e) => setFilter("lineup", e.target.checked)} />
              }
              label={<Typography variant="body2">Current lineup</Typography>}
            />
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
