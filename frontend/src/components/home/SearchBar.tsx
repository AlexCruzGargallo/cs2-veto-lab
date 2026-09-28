import { Box, TextField, InputAdornment, Button, CircularProgress } from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  placeholder?: string;
  size?: "small" | "medium";
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  loading = false,
  placeholder = "Search team",
  size = "medium",
}: SearchBarProps) {
  return (
    <form onSubmit={onSubmit}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          hiddenLabel
          placeholder={placeholder}
          fullWidth
          type="search"
          size={size}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          slotProps={{
            input: {
              sx: { bgcolor: "background.paper" },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant="contained"
          type="submit"
          disabled={loading}
          sx={{ px: size === "small" ? 2 : 3, minWidth: 96 }}
        >
          {loading ? <CircularProgress size={18} color="inherit" /> : "Search"}
        </Button>
      </Box>
    </form>
  );
}
