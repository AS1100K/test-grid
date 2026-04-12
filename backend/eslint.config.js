const js = require("@eslint/js");
const pluginJest = require("eslint-plugin-jest");
const globals = require("globals");

/** @type {import("eslint").Linter.FlatConfig[]} */
module.exports = [
  // Base JS recommended rules
  js.configs.recommended,

  // Node / backend specific settings and overrides
  {
    files: ["**/*.js", "**/*.cjs"],
    ignores: [
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "build/**",
      "tmp/**",
      "temp/**",
    ],

    plugins: {
      jest: pluginJest,
    },

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.jest,
      },
    },

    rules: {
      // You can tune these as desired; starting conservative.
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": "off", // common for backend logging
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-empty-function": [
        "error",
        {
          allow: ["constructors"],
        },
      ],
      curly: ["error", "all"],
      semi: ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      indent: ["error", 2, { SwitchCase: 1 }],
      "comma-dangle": ["error", "always-multiline"],

      // Jest
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/no-identical-title": "error",
      "jest/prefer-to-have-length": "warn",
      "jest/valid-expect": "error",
    },
  },
];
