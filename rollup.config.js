import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';
import postcss from 'rollup-plugin-postcss'
import autoPreprocess from 'svelte-preprocess';

const production = !process.env.ROLLUP_WATCH;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'svelte-start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

export default {
	input: 'src/client/main.js',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		file: 'public/build/bundle.js'
	},
	plugins: [
		json({
      		exclude: ['node_modules/**'],
		}),
		svelte({
			onwarn: (warning, handler) => {
				if (warning.code == 'a11y-missing-attribute' && warning.message == 'A11y: <a> element should have an href attribute') return;
				if (warning.code == 'a11y-invalid-attribute' && warning.message == "A11y: '#' is not a valid href attribute") return;
				console.log("warning:");
				console.log(warning);
				// let Rollup handle all other warnings normally
				handler(warning);
			},
			emitCss: true,
			preprocess: autoPreprocess(),
			compilerOptions: {
				// enable run-time checks when not in production
				dev: !production,
			}			
		}),
		postcss({
			extract: true,
			minimize: true,
			use: [
				['sass', {
					includePaths: [
							'./src/client/'
					]
				}]
			]
		}),
		// we'll extract any component CSS out into
		// a separate file - better for performance
		
		css({ output: 'bundle.css' }),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),
		commonjs(),

		/*
		//no need to serve as I am using electron
		
		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		!production && livereload('public'),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser()
		*/
	],
	watch: {
		clearScreen: false
	}
};
