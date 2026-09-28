import type { FaceitMatchEnriched, FaceitTeam } from "../types/faceit";
import { format } from "date-fns/format";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Table from "@mui/material/Table";

type VetosTableProps = {
  matches: FaceitMatchEnriched[];
  team: FaceitTeam;
};

const VetosTable = ({ matches, team }: VetosTableProps) => {
  console.log("matches", matches);

  const getVectorColor = (
    selectedBy: string,
    vetoStatus: string,
    teamFaction: string,
  ): string => {
    if (selectedBy !== teamFaction) {
      return "gray";
    } else {
      if (vetoStatus === "pick") {
        return "green";
      } else {
        return "red";
      }
    }
  };

  if (!team) return null;
  return (
    <div>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Round 1</TableCell>
            <TableCell>Round 2</TableCell>
            <TableCell>Round 3</TableCell>
            <TableCell>Round 4</TableCell>
            <TableCell>Round 5</TableCell>
            <TableCell>Round 6</TableCell>
            <TableCell>Round 7</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matches.map((match) => {
            const teamFaction =
              match.faction1 == team.name ? "faction1" : "faction2";
            return (
              <TableRow key={match.matchId}>
                <TableCell>
                  {format(new Date(match.date), "dd/MM/yyyy")}
                </TableCell>
                {match.vetos?.entities.map((veto) => (
                  <TableCell key={veto.round}>
                    <div>
                      <span>{veto.guid} </span>
                      <span>
                        {veto.selected_by === "faction1"
                          ? match.faction1
                          : match.faction2}{" "}
                      </span>
                      <span
                        style={{
                          color: getVectorColor(
                            veto.selected_by,
                            veto.status,
                            teamFaction,
                          ),
                        }}
                      >
                        {veto.status === "drop" ? "DROP" : "PICK"}
                      </span>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default VetosTable;
