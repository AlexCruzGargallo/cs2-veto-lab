import { FACEIT_MAPS } from "../types/cs2";
import type { FaceitMatchEnriched } from "../types/faceit";

type MapDetailsProps = {
  matches: FaceitMatchEnriched[];
};

const MapDetails = ({ matches }: MapDetailsProps) => {
  return (
    <div>
      <h2>Map Details</h2>
      <ul>
        {FACEIT_MAPS.map((map_name, i) => {
          return <p key={i}>{map_name}</p>;
        })}
      </ul>
    </div>
  );
};

export default MapDetails;
