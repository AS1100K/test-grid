const fs = require("fs");
const path = require("path");

const ROUTE_FILES = [
  { file: "routes/api/auth.js", basePath: "/api/auth" },
  { file: "routes/api/exams.js", basePath: "/api/exams" },
  { file: "routes/api/exams/parse_paper.js", basePath: "/api/exams/parse_paper" },
  { file: "routes/api/exams/paper.js", basePath: "/api/exams/paper" },
  { file: "routes/api/exams/questions.js", basePath: "/api/exams/questions" },
  { file: "routes/api/student.js", basePath: "/api/student" },
  { file: "routes/api/users.js", basePath: "/api/users" },
];

const HTTP_METHODS = ["get", "post", "put", "delete", "patch"];
const ROUTE_REGEX =
  /router\.(get|post|put|delete|patch)\(\s*["'`]([^"'`]+)["'`]/g;

function normalizePath(routePath) {
  if (routePath === "/") {
    return "/";
  }
  return routePath.replace(/\/+$/, "");
}

function normalizeExpressPath(routePath) {
  return normalizePath(routePath).replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
}

function joinPath(basePath, routePath) {
  const routePart = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return normalizeExpressPath(`${normalizePath(basePath)}${routePart}`);
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectRouteEndpoints(rootDir) {
  const endpoints = [];

  for (const routeFile of ROUTE_FILES) {
    const absoluteFilePath = path.join(rootDir, routeFile.file);
    const content = fs.readFileSync(absoluteFilePath, "utf8");

    let match = ROUTE_REGEX.exec(content);
    while (match !== null) {
      const method = match[1].toLowerCase();
      const relativePath = match[2];
      endpoints.push({
        method,
        path: joinPath(routeFile.basePath, relativePath),
      });
      match = ROUTE_REGEX.exec(content);
    }
    ROUTE_REGEX.lastIndex = 0;
  }

  return endpoints;
}

function collectOpenApiEndpoints(spec) {
  const endpoints = [];
  const paths = spec.paths || {};
  for (const [routePath, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      if (pathItem && Object.hasOwn(pathItem, method)) {
        endpoints.push({
          method,
          path: normalizePath(routePath),
        });
      }
    }
  }
  return endpoints;
}

function toEndpointKey(endpoint) {
  return `${endpoint.method.toUpperCase()} ${endpoint.path}`;
}

function uniqueSortedEndpointKeys(endpoints) {
  const keys = endpoints.map(toEndpointKey);
  return [...new Set(keys)].sort();
}

function getOpenApiCoverageDiff(rootDir = globalThis.process.cwd()) {
  const specPath = path.join(rootDir, "openapi.json");
  const spec = readJsonFile(specPath);
  const routeEndpointKeys = uniqueSortedEndpointKeys(collectRouteEndpoints(rootDir));
  const openApiEndpointKeys = uniqueSortedEndpointKeys(collectOpenApiEndpoints(spec));
  const routeEndpointSet = new Set(routeEndpointKeys);
  const openApiEndpointSet = new Set(openApiEndpointKeys);

  const missingInSpec = routeEndpointKeys.filter(
    (endpoint) => !openApiEndpointSet.has(endpoint),
  );
  const extraInSpec = openApiEndpointKeys.filter(
    (endpoint) => !routeEndpointSet.has(endpoint),
  );

  return {
    missingInSpec,
    extraInSpec,
  };
}

function assertOpenApiCoverage(rootDir) {
  const diff = getOpenApiCoverageDiff(rootDir);
  if (diff.missingInSpec.length === 0 && diff.extraInSpec.length === 0) {
    return diff;
  }

  const messages = [];
  if (diff.missingInSpec.length > 0) {
    messages.push(
      `Missing OpenAPI documentation for routes:\n- ${diff.missingInSpec.join("\n- ")}`,
    );
  }
  if (diff.extraInSpec.length > 0) {
    messages.push(
      `OpenAPI contains routes missing in code:\n- ${diff.extraInSpec.join("\n- ")}`,
    );
  }

  throw new Error(messages.join("\n\n"));
}

if (require.main === module) {
  assertOpenApiCoverage();
  globalThis.console.log("OpenAPI coverage check passed.");
}

module.exports = {
  getOpenApiCoverageDiff,
  assertOpenApiCoverage,
};
