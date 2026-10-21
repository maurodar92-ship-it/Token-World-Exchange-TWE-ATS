import { HttpError } from "./exchange.js";

export function handle(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      const out = await fn(req);
      return out instanceof Response ? out : Response.json(out);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: "Internal error" }, { status: 500 });
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { throw new HttpError(400, "Invalid JSON body"); }
}

/** Sandbox session: the acting participant is selected in the UI and sent as a header. */
export function actingParticipant(req: Request): string {
  const id = req.headers.get("x-twe-participant");
  if (!id) throw new HttpError(401, "Missing x-twe-participant header");
  return id;
}
