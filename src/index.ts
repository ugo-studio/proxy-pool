import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { myFetch } from "myfetchapi";
import { ReadStream } from "fs";
import * as http from "http";
import { getRandomIPv6 } from "./ip";

const app = new Hono();

app.get("/proxy", async (c) => {
  try {
    // GET URL
    const url = c.req.query("url");
    if (!url || !url.startsWith("http")) throw new Error("invalid url");
    // GET REQUEST AGENT
    const request = { ...c.req.raw } as any;
    const subnet = process.env.IPV6_SUBNET || null;
    const ipv6 = subnet ? getRandomIPv6(subnet) : null;
    if (subnet && ipv6) {
      request.agent = new http.Agent({
        family: 6,
        localAddress: ipv6,
      });
    }
    // LOG REQUEST INFO
    console.log(
      `Proxying request: ${url}, using ip(${ipv6}) from subnet(${subnet})`
    );
    // MAKE REQUEST
    const resp = await myFetch(url, request, {
      useNodeFetch: true,
      retryCondition: () => true,
      maxRetry: 1,
    });
    // RETURN RESPONSE
    return new Response(
      resp.body ? (ReadStream.toWeb(resp.body as any) as any) : null,
      resp
    );
  } catch (error: any) {
    console.error("Proxy error:", error);
    return c.text(error.message, 500);
  }
});

app.get("/*", (c) => {
  return c.json({ ok: true, req: c.req });
});

serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT || 8080),
  },
  (info) => console.log(`Server listening on http://localhost:${info.port}`)
);
