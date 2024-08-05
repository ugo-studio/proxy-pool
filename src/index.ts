import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { myFetch } from "myfetchapi";
import { ReadStream } from "fs";
import * as http from "http";
import * as https from "https";
import { getRandomIPv6 } from "./ip";

const app = new Hono();

app.all("/proxy", async (c) => {
  try {
    // GET URL
    const url = c.req.query("url");
    if (!url || !url.startsWith("http")) return c.text("invalid url", 400);
    // GET REQUEST AGENT
    const subnet = process.env.IPV6_SUBNET || null;
    const ipv6 = subnet ? getRandomIPv6(subnet) : null;
    const agent =
      subnet && ipv6
        ? new (url.startsWith("https:") ? https : http).Agent({
            family: 6,
            localAddress: ipv6,
          })
        : undefined;
    // LOG REQUEST INFO
    console.log(
      `Proxying request: ${url}, using ip(${ipv6}) from subnet(${subnet})`
    );
    // MAKE REQUEST
    const req: RequestInit = c.req.raw;
    const resp = await myFetch(
      url,
      {
        agent,
        method: req.method,
        headers: req.headers as any,
        body: req.body ? ReadStream.fromWeb(req.body as any) : undefined,
      },
      {
        useNodeFetch: true,
        retryCondition: () => true,
        maxRetry: 1,
      }
    );
    // RETURN RESPONSE
    return new Response(resp.body, resp);
  } catch (error: any) {
    console.error("Proxy error:", error);
    return c.text(error.message, 500);
  }
});

app.all("/test", async (c) => {
  const headers = (() => {
    const head: any = {};
    c.req.raw.headers.forEach((v, k) => (head[k] = v));
    return head;
  })();
  return c.json({
    method: c.req.method,
    headers: headers,
    data: c.req.raw.body ? await c.req.text() : null,
    req: c.req,
  });
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
