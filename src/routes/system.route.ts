import { Router } from "express";
import { systemController } from "@/controllers/system.controller";

const systemRouter = Router();

systemRouter.post("/run-tasks", systemController.runTasks);

export default systemRouter;
