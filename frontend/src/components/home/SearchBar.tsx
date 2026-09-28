import { Box, TextField, InputAdornment, Button } from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
}: SearchBarProps) {
  return (
    <form onSubmit={onSubmit}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          hiddenLabel
          placeholder="Search team"
          fullWidth
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button variant="contained" type="submit">
          Search
        </Button>
      </Box>
    </form>
  );
}
