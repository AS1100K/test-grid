const fs = require("fs");
const os = require("os");
const path = require("path");

const { getOpenApiCoverageDiff } = require("../scripts/openapiCoverage");
const fixtureRootDirs = [];

function createFixture({ routeFiles, specPaths }) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "openapi-coverage-"));

  for (const [relativeFilePath, content] of Object.entries(routeFiles)) {
    const absoluteFilePath = path.join(rootDir, relativeFilePath);
    fs.mkdirSync(path.dirname(absoluteFilePath), { recursive: true });
    fs.writeFileSync(absoluteFilePath, content);
  }

  fs.writeFileSync(
    path.join(rootDir, "openapi.json"),
    JSON.stringify(
      {
        openapi: "3.0.3",
        info: { title: "fixture", version: "1.0.0" },
        paths: specPaths,
      },
      null,
      2,
    ),
  );

  fixtureRootDirs.push(rootDir);
  return rootDir;
}

afterEach(() => {
  while (fixtureRootDirs.length > 0) {
    const rootDir = fixtureRootDirs.pop();
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("OpenAPI documentation matches backend routes", () => {
  const diff = getOpenApiCoverageDiff();
  expect(diff).toStrictEqual({
    missingInSpec: [],
    extraInSpec: [],
    pathFormatMismatches: [],
    missingPathParams: [],
    invalidPathParams: [],
    extraPathParams: [],
    missingQueryParams: [],
    extraQueryParams: [],
  });
});

test("flags missing endpoint docs", () => {
  const rootDir = createFixture({
    routeFiles: {
      "routes/api.js": `
        const express = require("express");
        const authRouter = require("./api/auth");
        const router = express.Router();
        router.use("/auth", authRouter);
        module.exports = router;
      `,
      "routes/api/auth.js": `
        const express = require("express");
        const router = express.Router();
        router.get("/missing", async function (req, res, _) { return res.status(200).send({}); });
        module.exports = router;
      `,
    },
    specPaths: {},
  });

  const diff = getOpenApiCoverageDiff(rootDir);
  expect(diff.missingInSpec).toContain("GET /api/auth/missing");
});

test("flags mismatched path param names", () => {
  const rootDir = createFixture({
    routeFiles: {
      "routes/api.js": `
        const express = require("express");
        const authRouter = require("./api/auth");
        const router = express.Router();
        router.use("/auth", authRouter);
        module.exports = router;
      `,
      "routes/api/auth.js": `
        const express = require("express");
        const router = express.Router();
        router.get("/:user_id", async function (req, res, _) { return res.status(200).send(req.params.user_id); });
        module.exports = router;
      `,
    },
    specPaths: {
      "/api/auth/{id}": {
        get: {
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
        },
      },
    },
  });

  const diff = getOpenApiCoverageDiff(rootDir);
  expect(diff.pathFormatMismatches[0]).toContain("GET /api/auth/{user_id}");
  expect(diff.pathFormatMismatches[0]).toContain("/api/auth/{id}");
});

test("flags missing query parameter docs", () => {
  const rootDir = createFixture({
    routeFiles: {
      "routes/api.js": `
        const express = require("express");
        const authRouter = require("./api/auth");
        const router = express.Router();
        router.use("/auth", authRouter);
        module.exports = router;
      `,
      "routes/api/auth.js": `
        const express = require("express");
        const router = express.Router();
        router.get("/search", async function (req, res, _) {
          return res.status(200).send({ q: req.query.q });
        });
        module.exports = router;
      `,
    },
    specPaths: {
      "/api/auth/search": {
        get: {},
      },
    },
  });

  const diff = getOpenApiCoverageDiff(rootDir);
  expect(diff.missingQueryParams).toContain(
    "GET /api/auth/search missing query parameter 'q'",
  );
});

test("flags stale documented endpoints", () => {
  const rootDir = createFixture({
    routeFiles: {
      "routes/api.js": `
        const express = require("express");
        const authRouter = require("./api/auth");
        const router = express.Router();
        router.use("/auth", authRouter);
        module.exports = router;
      `,
      "routes/api/auth.js": `
        const express = require("express");
        const router = express.Router();
        router.get("/live", async function (req, res, _) { return res.status(200).send({}); });
        module.exports = router;
      `,
    },
    specPaths: {
      "/api/auth/live": {
        get: {},
      },
      "/api/auth/stale": {
        get: {},
      },
    },
  });

  const diff = getOpenApiCoverageDiff(rootDir);
  expect(diff.extraInSpec).toContain("GET /api/auth/stale");
});
