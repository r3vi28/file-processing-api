const js = require("@eslint/js");
const { defineConfig, globalIgnores } = require("eslint/config");
const tseslint = require("typescript-eslint");
const prettier = require("eslint-config-prettier");

module.exports = defineConfig([
    globalIgnores(["dist", "coverage/"]),
    js.configs.recommended,
    tseslint.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: { sourceType: "commonjs"},
        rules: {
            "@typescript-eslint/no-require-imports": "off"
        }
    },
    prettier
])