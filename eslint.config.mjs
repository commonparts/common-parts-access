import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
	...nextCoreWebVitals,
	...nextTypeScript,
	{
		ignores: ["supabase/**", "coverage/**"],
	},
	{
		// Interface text comes from messages/ (#500): JSX text may only be
		// punctuation or a symbol. The legal pages are long-form texts written
		// in TSX, one component per locale (docs/I18N.md).
		files: ["app/**/*.tsx", "components/**/*.tsx"],
		ignores: ["app/**/*.en.tsx", "app/**/*.fr.tsx"],
		rules: {
			"react/jsx-no-literals": [
				"error",
				{ allowedStrings: ["·", "/", "—", "→", "+", "#", "@", ".", "...", "…", "×", "📍"] },
			],
		},
	},
];

export default eslintConfig;
