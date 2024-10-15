import { fixupConfigRules } from "@eslint/compat";
import globals from "globals";
import parser from "vue-eslint-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from "@vue/eslint-config-typescript";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    ...pluginVue.configs['flat/recommended'],
    ...vueTsEslintConfig(),
    ...fixupConfigRules(compat.extends(
        "eslint:recommended",
        "plugin:import/errors",
        // "@vue/prettier",
    )), {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        parser: parser,
        ecmaVersion: 2020,
        sourceType: "module",

        parserOptions: {
            parser: "@typescript-eslint/parser",
        },
    },

    settings: {
        "import/resolver": {
            alias: {
                map: [["~", "./"]],
                extensions: [".ts", ".vue"],
            },
        },
    },

    rules: {
        "no-undef": "off",
        "vue/multi-word-component-names": "off"
    },
}, {
    files: ["./layouts/**/*.vue", "./pages/**/*.vue"],

    rules: {
        "vue/multi-word-component-names": "off",
    },
}];