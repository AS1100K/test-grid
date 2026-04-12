const js = require("@eslint/js");

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

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
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
    },
  },
];
