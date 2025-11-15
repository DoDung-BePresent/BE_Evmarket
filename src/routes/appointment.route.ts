/**
 * Node modules
 */
import { Router } from "express";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";

/**
 * Controllers
 */
import { appointmentController } from "@/controllers/appointment.controller";

/**
 * Validations
 */
import { appointmentValidation } from "@/validations/appointment.validation";

const appointmentRouter = Router();

appointmentRouter.use(authenticate);

appointmentRouter.get(
  "/me",
  validate(appointmentValidation.getAppointments),
  appointmentController.getMyAppointments,
);

appointmentRouter.post(
  "/:appointmentId/propose-date",
  validate(appointmentValidation.proposeDate),
  appointmentController.proposeDate,
);

appointmentRouter.post(
  "/:appointmentId/confirm",
  validate(appointmentValidation.confirmDate),
  appointmentController.confirmDate,
);

export default appointmentRouter;
