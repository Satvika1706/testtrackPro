
import http from "http";
import app from "./app";
import dotenv from "dotenv";
dotenv.config();
import { initializeSocket } from "./socket";
import { WebhookService } from "./modules/integrations/webhook.service";

const PORT = Number(process.env.PORT ?? 5000);
const server = http.createServer(app);

initializeSocket(server);
WebhookService.startWorker();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
