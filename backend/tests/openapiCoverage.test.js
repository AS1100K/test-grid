const { getOpenApiCoverageDiff } = require("../scripts/openapiCoverage");

test("OpenAPI documentation matches backend routes", () => {
  const diff = getOpenApiCoverageDiff();
  expect(diff).toStrictEqual({
    missingInSpec: [],
    extraInSpec: [],
  });
});
