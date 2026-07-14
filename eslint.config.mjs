import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const toFlatConfigArray = (config) =>
	Array.isArray(config) ? config : [config];

const eslintConfig = [
	...toFlatConfigArray(nextCoreWebVitals),
	...toFlatConfigArray(nextTypeScript),
	{
		ignores: ["supabase/**", "coverage/**"],
	},
];

export default eslintConfig;
