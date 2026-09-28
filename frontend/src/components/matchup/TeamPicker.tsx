import { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import SearchBar from "../home/SearchBar";
import { searchTeams } from "../../services/faceit";
import type { FaceitTeam } from "../../types/faceit";
import { colors } from "../../themes/tokens";

type TeamPickerProps = {
  label: string;
  title: string;
  onPick: (team: FaceitTeam) => void;
};

export default function TeamPicker({ label, title, onPick }: TeamPickerProps) {
  const [term, setTerm] = useState("");
  const [teams, setTeams] = useState<FaceitTeam[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setTeams(await searchTeams(term.trim()));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        bgcolor: "background.paper",
        border: `1px dashed ${colors.borderStrong}`,
        borderRadius: 3,
        p: 2,
        textAlign: "left",
      }}
    >
      <Typography variant="overline" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <SearchBar value={term} onChange={setTerm} onSubmit={handleSubmit} loading={loading} size="small" />
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {teams && !loading && (
        <List dense sx={{ maxHeight: 280, overflow: "auto", mt: 1 }}>
          {teams.length === 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary", p: 1 }}>
              No teams found.
            </Typography>
          )}
          {teams.map((team) => (
            <ListItemButton key={team.team_id} onClick={() => onPick(team)} sx={{ borderRadius: 2 }}>
              <ListItemAvatar>
                <Avatar src={team.avatar || undefined} variant="rounded">
                  {team.name[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={team.name} secondary={team.nickname} />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
