import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import faceitRoutes from "./routes/faceit.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", faceitRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
