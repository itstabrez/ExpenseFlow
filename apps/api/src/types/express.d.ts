import type { RoleName } from "@expense-flow/shared";

declare global {
  namespace Express {
    interface User {
      id: string;
      role: RoleName;
      email: string;
      isActive: boolean;
    }

    interface Request {
      user?: User;
    }
  }
}
