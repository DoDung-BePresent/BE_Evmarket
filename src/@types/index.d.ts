import type { User as PrismaUser } from "@prisma/client";

declare global {
  namespace Express {
    interface AuthInfo {}

    interface User extends PrismaUser {}

    interface Request {
      authInfo?: AuthInfo | undefined;
      user?: User | undefined;
      /**
       * Holds the validated and transformed data from the `validate` middleware.
       * This object contains `body`, `query`, and `params` properties after
       * being processed by Zod.
       */
      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}
