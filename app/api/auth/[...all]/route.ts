import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { ready } from "@/lib/db";

const handler = toNextJsHandler(auth);

export async function GET(req: Request) {
  await ready();
  return handler.GET(req);
}

export async function POST(req: Request) {
  await ready();
  return handler.POST(req);
}
