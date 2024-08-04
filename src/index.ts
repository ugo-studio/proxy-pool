import * as http from "http";
import { createProxyServer } from "http-proxy";
import { getRandomIPv6 } from "./ip";

// Create a proxy server
const proxy = createProxyServer({});

// Create an HTTP server
const server = http.createServer((req, res) => {
  // Log the request URL
  console.log(`Proxying request: ${req.url}`);

  // Create ipv6 pool agent
  const subnet = process.env.IPV6_SUBNET;
  const agent = new http.Agent(
    subnet
      ? {
          family: 6,
          localAddress: getRandomIPv6(subnet),
        }
      : {}
  );

  // Forward the request to the target
  proxy.web(req, res, { target: req.url, agent }, (error) => {
    console.error("Proxy error:", error);
    res.writeHead(500);
    res.end(`Proxy error: ${error.message}`);
  });
});

// Listen on port 8080
server.listen(8080, () => {
  console.log("Proxy server is running on http://localhost:8080");
});
