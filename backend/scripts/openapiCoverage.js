const fs = require("fs");
const path = require("path");

const HTTP_METHODS = ["get", "post", "put", "delete", "patch"];
const ROUTE_DEFINITION_REGEX =
  /router\.(get|post|put|delete|patch)\(\s*["'`]([^"'`]+)["'`]\s*,/g;
const ROUTER_USE_REGEX =
  /router\.use\(\s*["'`]([^"'`]+)["'`]\s*,\s*([a-zA-Z_$][\w$]*)\s*\)/g;
const REQUIRE_REGEX =
  /(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*require\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

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
  if (normalizePath(routePath) === "/") {
    return normalizePath(basePath);
  }

  const routePart = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return normalizeExpressPath(`${normalizePath(basePath)}${routePart}`);
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function pathShape(routePath) {
  return routePath.replace(/\{[^{}]+\}/g, "{}");
}

function toEndpointKey(endpoint) {
  return `${endpoint.method.toUpperCase()} ${endpoint.path}`;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function extractNamesByRegex(content, regex) {
  const names = new Set();
  let match = regex.exec(content);
  while (match !== null) {
    names.add(match[1]);
    match = regex.exec(content);
  }
  regex.lastIndex = 0;
  return names;
}

function extractQueryParams(routeCodeSegment) {
  const names = new Set();

  for (const name of extractNamesByRegex(
    routeCodeSegment,
    /req\.query\.([a-zA-Z0-9_]+)/g,
  )) {
    names.add(name);
  }

  for (const name of extractNamesByRegex(
    routeCodeSegment,
    /req\.query\?\.([a-zA-Z0-9_]+)/g,
  )) {
    names.add(name);
  }

  const destructureRegex = /\{([^}]+)\}\s*=\s*req\.query\b/g;
  let destructureMatch = destructureRegex.exec(routeCodeSegment);
  while (destructureMatch !== null) {
    const vars = destructureMatch[1].split(",").map((item) => item.trim());
    for (const variable of vars) {
      if (!variable) {
        continue;
      }

      const [left] = variable.split("=");
      const cleaned = left.trim().split(":")[0].trim();
      if (/^[a-zA-Z_$][\w$]*$/.test(cleaned)) {
        names.add(cleaned);
      }
    }

    destructureMatch = destructureRegex.exec(routeCodeSegment);
  }

  return names;
}

function extractPathParams(routePath) {
  return extractNamesByRegex(routePath, /\{([a-zA-Z0-9_]+)\}/g);
}

function parseRequireMap(fileContent) {
  const requireMap = new Map();
  let match = REQUIRE_REGEX.exec(fileContent);
  while (match !== null) {
    requireMap.set(match[1], match[2]);
    match = REQUIRE_REGEX.exec(fileContent);
  }
  REQUIRE_REGEX.lastIndex = 0;
  return requireMap;
}

function resolveRequirePath(currentFilePath, requiredPath) {
  if (!requiredPath.startsWith(".")) {
    return null;
  }

  const resolvedBase = path.resolve(path.dirname(currentFilePath), requiredPath);
  const candidates = [
    resolvedBase,
    `${resolvedBase}.js`,
    path.join(resolvedBase, "index.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function collectRouteEndpoints(rootDir) {
  const entryFile = path.join(rootDir, "routes/api.js");
  const endpoints = [];
  const visited = new Set();

  function visitRouterFile(filePath, basePath) {
    const normalizedFilePath = path.normalize(filePath);
    if (visited.has(normalizedFilePath)) {
      return;
    }
    visited.add(normalizedFilePath);

    const content = fs.readFileSync(normalizedFilePath, "utf8");
    const requireMap = parseRequireMap(content);

    const routeMatches = [];
    let routeMatch = ROUTE_DEFINITION_REGEX.exec(content);
    while (routeMatch !== null) {
      routeMatches.push({
        method: routeMatch[1].toLowerCase(),
        relativePath: routeMatch[2],
        startIndex: routeMatch.index,
      });
      routeMatch = ROUTE_DEFINITION_REGEX.exec(content);
    }
    ROUTE_DEFINITION_REGEX.lastIndex = 0;

    for (let i = 0; i < routeMatches.length; i++) {
      const current = routeMatches[i];
      const next = routeMatches[i + 1];
      const segment = content.slice(current.startIndex, next ? next.startIndex : content.length);
      endpoints.push({
        method: current.method,
        path: joinPath(basePath, current.relativePath),
        queryParams: extractQueryParams(segment),
      });
    }

    let useMatch = ROUTER_USE_REGEX.exec(content);
    while (useMatch !== null) {
      const mountPath = useMatch[1];
      const variableName = useMatch[2];
      const requiredPath = requireMap.get(variableName);
      if (requiredPath) {
        const childFilePath = resolveRequirePath(normalizedFilePath, requiredPath);
        if (childFilePath) {
          visitRouterFile(childFilePath, joinPath(basePath, mountPath));
        }
      }
      useMatch = ROUTER_USE_REGEX.exec(content);
    }
    ROUTER_USE_REGEX.lastIndex = 0;
  }

  visitRouterFile(entryFile, "/api");
  return endpoints;
}

function collectOpenApiEndpoints(spec) {
  const endpoints = [];
  const paths = spec.paths || {};

  for (const [routePath, pathItem] of Object.entries(paths)) {
    const pathLevelParameters = Array.isArray(pathItem?.parameters)
      ? pathItem.parameters
      : [];

    for (const method of HTTP_METHODS) {
      if (!pathItem || !Object.hasOwn(pathItem, method)) {
        continue;
      }

      const operation = pathItem[method] || {};
      const operationParameters = Array.isArray(operation.parameters)
        ? operation.parameters
        : [];
      const parameters = [...pathLevelParameters, ...operationParameters].filter(
        (p) => p && typeof p === "object",
      );

      const pathParams = new Map();
      const queryParams = new Set();

      for (const parameter of parameters) {
        if (parameter.in === "path" && typeof parameter.name === "string") {
          pathParams.set(parameter.name, parameter.required === true);
        }
        if (parameter.in === "query" && typeof parameter.name === "string") {
          queryParams.add(parameter.name);
        }
      }

      endpoints.push({
        method,
        path: normalizePath(routePath),
        pathParams,
        queryParams,
      });
    }
  }

  return endpoints;
}

function getOpenApiCoverageDiff(rootDir = globalThis.process.cwd()) {
  const specPath = path.join(rootDir, "openapi.json");
  const spec = readJsonFile(specPath);

  const routeEndpoints = collectRouteEndpoints(rootDir);
  const openApiEndpoints = collectOpenApiEndpoints(spec);

  const routeEndpointMap = new Map(
    routeEndpoints.map((endpoint) => [toEndpointKey(endpoint), endpoint]),
  );
  const openApiEndpointMap = new Map(
    openApiEndpoints.map((endpoint) => [toEndpointKey(endpoint), endpoint]),
  );

  const routeEndpointKeys = uniqueSorted([...routeEndpointMap.keys()]);
  const openApiEndpointKeys = uniqueSorted([...openApiEndpointMap.keys()]);

  const missingInSpec = routeEndpointKeys.filter(
    (endpointKey) => !openApiEndpointMap.has(endpointKey),
  );
  const extraInSpec = openApiEndpointKeys.filter(
    (endpointKey) => !routeEndpointMap.has(endpointKey),
  );

  const pathFormatMismatches = [];
  for (const endpointKey of missingInSpec) {
    const routeEndpoint = routeEndpointMap.get(endpointKey);
    const matchingShapes = openApiEndpoints.filter(
      (openApiEndpoint) =>
        openApiEndpoint.method === routeEndpoint.method &&
        pathShape(openApiEndpoint.path) === pathShape(routeEndpoint.path),
    );

    if (matchingShapes.length > 0) {
      pathFormatMismatches.push(
        `${endpointKey} does not match documented path(s): ${matchingShapes
          .map((endpoint) => endpoint.path)
          .sort()
          .join(", ")}`,
      );
    }
  }

  const missingPathParams = [];
  const invalidPathParams = [];
  const extraPathParams = [];
  const missingQueryParams = [];
  const extraQueryParams = [];

  for (const [endpointKey, routeEndpoint] of routeEndpointMap.entries()) {
    const openApiEndpoint = openApiEndpointMap.get(endpointKey);
    if (!openApiEndpoint) {
      continue;
    }

    const routePathParams = extractPathParams(routeEndpoint.path);

    for (const routeParamName of routePathParams) {
      if (!openApiEndpoint.pathParams.has(routeParamName)) {
        missingPathParams.push(`${endpointKey} missing path parameter '${routeParamName}'`);
      } else if (openApiEndpoint.pathParams.get(routeParamName) !== true) {
        invalidPathParams.push(
          `${endpointKey} path parameter '${routeParamName}' must set required=true`,
        );
      }
    }

    for (const documentedPathParamName of openApiEndpoint.pathParams.keys()) {
      if (!routePathParams.has(documentedPathParamName)) {
        extraPathParams.push(
          `${endpointKey} has undocumented route path parameter '${documentedPathParamName}' in OpenAPI`,
        );
      }
    }

    for (const routeQueryParam of routeEndpoint.queryParams) {
      if (!openApiEndpoint.queryParams.has(routeQueryParam)) {
        missingQueryParams.push(`${endpointKey} missing query parameter '${routeQueryParam}'`);
      }
    }

    for (const documentedQueryParam of openApiEndpoint.queryParams) {
      if (!routeEndpoint.queryParams.has(documentedQueryParam)) {
        extraQueryParams.push(
          `${endpointKey} documents unused query parameter '${documentedQueryParam}'`,
        );
      }
    }
  }

  return {
    missingInSpec,
    extraInSpec,
    pathFormatMismatches: uniqueSorted(pathFormatMismatches),
    missingPathParams: uniqueSorted(missingPathParams),
    invalidPathParams: uniqueSorted(invalidPathParams),
    extraPathParams: uniqueSorted(extraPathParams),
    missingQueryParams: uniqueSorted(missingQueryParams),
    extraQueryParams: uniqueSorted(extraQueryParams),
  };
}

function assertOpenApiCoverage(rootDir) {
  const diff = getOpenApiCoverageDiff(rootDir);

  const hasAnyMismatch =
    diff.missingInSpec.length > 0 ||
    diff.extraInSpec.length > 0 ||
    diff.pathFormatMismatches.length > 0 ||
    diff.missingPathParams.length > 0 ||
    diff.invalidPathParams.length > 0 ||
    diff.extraPathParams.length > 0 ||
    diff.missingQueryParams.length > 0 ||
    diff.extraQueryParams.length > 0;

  if (!hasAnyMismatch) {
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

  if (diff.pathFormatMismatches.length > 0) {
    messages.push(
      `Route path parameter name mismatches:\n- ${diff.pathFormatMismatches.join("\n- ")}`,
    );
  }

  if (diff.missingPathParams.length > 0) {
    messages.push(
      `Missing OpenAPI path parameter docs:\n- ${diff.missingPathParams.join("\n- ")}`,
    );
  }

  if (diff.invalidPathParams.length > 0) {
    messages.push(
      `Invalid OpenAPI path parameter docs:\n- ${diff.invalidPathParams.join("\n- ")}`,
    );
  }

  if (diff.extraPathParams.length > 0) {
    messages.push(
      `OpenAPI path parameter docs not present in routes:\n- ${diff.extraPathParams.join("\n- ")}`,
    );
  }

  if (diff.missingQueryParams.length > 0) {
    messages.push(
      `Missing OpenAPI query parameter docs:\n- ${diff.missingQueryParams.join("\n- ")}`,
    );
  }

  if (diff.extraQueryParams.length > 0) {
    messages.push(
      `OpenAPI query parameter docs not present in routes:\n- ${diff.extraQueryParams.join("\n- ")}`,
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
