// Require packages
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");

// Create an instance of Express app
const app = express();

// Middleware setup
app.use(cors()); // Enable CORS
app.use(helmet()); // Add security headers
app.use(morgan("combined")); // Log HTTP requests
app.disable("x-powered-by"); // Hide Express server information

// Define routes and corresponding microservices
const services = [
  {
    route: "/auth",
    target: "https://your-deployed-service.herokuapp.com/auth",
  },
  {
    route: "/users",
    target: "https://your-deployed-service.herokuapp.com/users/",
  },
  {
    route: "/chats",
    target: "https://your-deployed-service.herokuapp.com/chats/",
  },
  {
    route: "/payment",
    target: "https://your-deployed-service.herokuapp.com/payment/",
  },
  // Add more services as needed
];

// Set up proxy middleware for each microservice
services.forEach(({ route, target }) => {
  // Add rate limiting and timeout options
  const proxyOptions = {
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^${route}`]: "",
    },
    // Rate limiting configuration (example: limit to 100 requests per minute)
    onProxyReq(proxyReq, req, res) {
      const rateLimit = 100; // Max requests per minute
      const interval = 60 * 1000; // Time window in milliseconds (1 minute)
      const ip = req.ip; // Get client IP address

      // Retrieve or initialize request count for the IP address
      const requestCount = req.rateLimit || (req.rateLimit = {});

      // Update request count for the current IP
      requestCount[ip] = (requestCount[ip] || 0) + 1;

      // Check if request count exceeds the rate limit
      if (requestCount[ip] > rateLimit) {
        // Respond with a 429 Too Many Requests status code
        res.status(429).json({
          code: 429,
          status: "Error",
          message: "Rate limit exceeded.",
          data: null,
        });
        return;
      }

      // Set timeout for each request (example: 10 seconds)
      proxyReq.setTimeout(10000, () => {
        // Handle timeout error
        res.status(504).json({
          code: 504,
          status: "Error",
          message: "Gateway timeout.",
          data: null,
        });
        proxyReq.abort(); // Abort the proxy request
      });
    },
  };

  // Apply proxy middleware for the current microservice
  app.use(route, createProxyMiddleware(proxyOptions));
});

// Handler for route-not-found
app.use((_req, res) => {
  res.status(404).json({
    code: 404,
    status: "Error",
    message: "Route not found.",
    data: null,
  });
});

// Define port for Express server
const PORT = process.env.PORT || 5000;

// Start Express server
app.listen(PORT, () => {
  console.log(`Gateway is running on port ${PORT}`);
});


