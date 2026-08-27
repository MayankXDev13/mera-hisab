declare global {
  namespace Express {
    interface Request {
      validatedBody?: unknown;
      validatedQuery?: unknown;
      validatedParams?: unknown;
      user?: { id: string; email?: string; name?: string };
      session?: unknown;
    }
  }
}

export {};
