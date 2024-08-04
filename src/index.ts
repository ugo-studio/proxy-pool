import * as http from "http";
import { createProxyServer } from "http-proxy";
import { getRandomIPv6 } from "./ip";

// Create a proxy server
const proxy = createProxyServer({});

// Create an HTTP server
const server = http.createServer((req, res) => {
  // Create ipv6 pool agent
  const subnet = process.env.IPV6_SUBNET || null;
  const ipv6 = subnet ? getRandomIPv6(subnet) : null;
  const agent = new http.Agent(
    subnet && ipv6
      ? {
          family: 6,
          localAddress: ipv6,
        }
      : {}
  );

  // Log the request URL
  console.log(
    `Proxying request: ${req.url}, using ip(${ipv6}) from subnet(${subnet})`
  );

  // Forward the request to the target
  proxy.web(req, res, { target: req.url, agent }, (error) => {
    console.error("Proxy error:", error);
    res.writeHead(500);
    res.end(`Proxy error: ${error.message}`);
  });
});

// Listen on port
const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log("Proxy server is running on http://localhost:8080");
});
