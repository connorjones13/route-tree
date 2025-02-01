import { matchRoutes } from "react-router";
import { RouteTree } from "./RouteTree";

// Helper function to measure execution time
function measureTime(fn: () => void, iterations: number = 1000): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  return (end - start) / iterations; // Average time per iteration in ms
}

// Helper to generate large number of routes
function generateLargeRouteSet(count: number): string[] {
  const routes: string[] = [];
  const sections = [
    "users",
    "products",
    "categories",
    "posts",
    "comments",
    "orders",
    "items",
    "profiles",
    "settings",
    "docs",
  ];
  const dynamicParams = [
    "id",
    "slug",
    "category",
    "year",
    "month",
    "day",
    "type",
    "status",
  ];

  // Generate different types of routes
  for (let i = 0; i < count; i++) {
    const routeType = i % 4; // 0: static, 1: dynamic, 2: nested static, 3: nested dynamic

    switch (routeType) {
      case 0: // Static routes
        const section = sections[i % sections.length];
        routes.push(`/${section}/${Math.floor(i / sections.length)}`);
        break;

      case 1: // Dynamic routes
        const paramName = dynamicParams[i % dynamicParams.length];
        routes.push(`/${sections[i % sections.length]}/:${paramName}`);
        break;

      case 2: // Nested static routes
        const depth = (i % 3) + 2; // 2-4 levels deep
        const path = Array(depth)
          .fill(0)
          .map((_, index) => sections[(i + index) % sections.length])
          .join("/");
        routes.push(`/${path}`);
        break;

      case 3: // Nested dynamic routes
        const dynamicDepth = (i % 3) + 2; // 2-4 levels deep
        const dynamicPath = Array(dynamicDepth)
          .fill(0)
          .map((_, index) => {
            return index % 2 === 0
              ? sections[(i + index) % sections.length]
              : `:${dynamicParams[(i + index) % dynamicParams.length]}`;
          })
          .join("/");
        routes.push(`/${dynamicPath}`);
        break;
    }
  }

  return routes;
}

// Test scenarios
const scenarios = [
  {
    name: "Simple static routes",
    routes: [
      "/",
      "/about",
      "/contact",
      "/products",
      "/products/featured",
      "/blog",
      "/blog/posts",
    ],
    testPaths: ["/", "/about", "/products/featured", "/nonexistent"],
  },
  {
    name: "Dynamic parameter routes",
    routes: [
      "/users/:id",
      "/products/:category/:id",
      "/blog/:year/:month/:day",
      "/posts/:id/comments/:commentId",
    ],
    testPaths: [
      "/users/123",
      "/products/electronics/456",
      "/blog/2024/03/15",
      "/posts/789/comments/999",
    ],
  },
  {
    name: "Mixed static and dynamic routes",
    routes: [
      "/",
      "/about",
      "/users/:id",
      "/users/:id/profile",
      "/products/:category",
      "/products/featured",
      "/blog/:year/:month",
    ],
    testPaths: [
      "/",
      "/about",
      "/users/123",
      "/users/456/profile",
      "/products/electronics",
      "/products/featured",
    ],
  },
  {
    name: "Deep nested routes",
    routes: [
      "/a/b/c/d/e",
      "/a/b/c/d/:id",
      "/a/b/:param1/d/:param2",
      "/a/b/c/d/e/f/g",
    ],
    testPaths: [
      "/a/b/c/d/e",
      "/a/b/c/d/123",
      "/a/b/xyz/d/789",
      "/a/b/c/d/e/f/g",
    ],
  },
  {
    name: "Large scale mixed routes (10k routes)",
    routes: generateLargeRouteSet(10000),
    testPaths: [
      // Static route tests
      "/users/42",
      "/products/featured",
      "/categories/electronics/games",
      // Dynamic route tests
      "/users/123/profile",
      "/products/electronics/456",
      "/posts/789/comments/999",
      // Deep nested tests
      "/users/settings/profile/preferences",
      "/products/categories/electronics/gaming/consoles",
      // Non-existent routes
      "/this/path/does/not/exist",
      "/invalid/route",
    ],
  },
];

// Convert routes for react-router format
function createReactRouterRoutes(paths: string[]) {
  return paths.map((path) => ({
    path,
    element: null, // React Router requires this but we won't use it
  }));
}

// Setup RouteTree
function setupRouteTree(paths: string[]) {
  const tree = new RouteTree();
  paths.forEach((path) => {
    tree.addRoute(path, () => "handler");
  });
  return tree;
}

function runScenarios() {
  // Run benchmarks
  console.log("Running performance benchmarks...\n");

  scenarios.forEach((scenario) => {
    console.log(`\nScenario: ${scenario.name}`);
    console.log("-".repeat(50));

    // Setup
    console.log(`Setting up ${scenario.routes.length} routes...`);
    const setupStart = performance.now();
    const reactRouterRoutes = createReactRouterRoutes(scenario.routes);
    const routeTree = setupRouteTree(scenario.routes);
    const setupEnd = performance.now();
    console.log(`Setup time: ${(setupEnd - setupStart).toFixed(2)}ms\n`);
    console.log(routeTree.toVisualTree());

    // Test each path
    scenario.testPaths.forEach((testPath) => {
      console.log(`\nTesting path: ${testPath}`);

      // Test React Router
      const reactRouterTime = measureTime(() => {
        matchRoutes(reactRouterRoutes, testPath);
      });

      // Test RouteTree
      const routeTreeTime = measureTime(() => {
        routeTree.match(testPath);
      });

      console.log(`React Router: ${reactRouterTime.toFixed(5)}ms`);
      console.log(`RouteTree:    ${routeTreeTime.toFixed(5)}ms`);
      console.log(
        `Difference:   ${(
          ((reactRouterTime - routeTreeTime) / reactRouterTime) *
          100
        ).toFixed(1)}% ${routeTreeTime < reactRouterTime ? "faster" : "slower"}`
      );
    });
  });
}

// Test the visual tree representation
function testVisualTree() {
  console.log("\nTesting Tree Visualization");
  console.log("-".repeat(50));

  const tree = new RouteTree();
  const testRoutes = [
    "/",
    "/users",
    "/users/:id",
    "/users/:id/profile",
    "/products",
    "/products/featured",
    "/products/:category",
    "/products/:category/:id",
    "/blog/:year/:month/:day",
    "/api/$",
  ];

  testRoutes.forEach((route) => {
    tree.addRoute(route, () => "handler");
  });

  console.log(tree.toVisualTree());
}

// Run visualization test
// testVisualTree();

runScenarios();
