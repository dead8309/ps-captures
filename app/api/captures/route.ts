import { PsnApiHandler } from "@/lib/auth-handler";

const { handler } = PsnApiHandler;

type Handler = (req: Request) => Promise<Response>;

export const GET: Handler = handler;
export const POST: Handler = handler;
export const PUT: Handler = handler;
export const PATCH: Handler = handler;
export const DELETE: Handler = handler;
export const OPTIONS: Handler = handler;
