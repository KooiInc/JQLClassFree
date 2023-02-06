import builder from 'esbuild';
import process from 'node:process';
const log = console.log.bind(console);
const esContext = {
  entryPoints: ['./index.js'],
  bundle: true,
  outfile: './bundle/jql.min.js',
  treeShaking: true,
  sourcemap: false, // don't need it
  minify: true,
  format: 'esm',
  target: ['esnext'],
};

const plugins = [{
  name: 'grrr',
  setup(build) {
    let count = 0;
    build.onEnd(result => {
      count += 1;
      return onRebuild(result.errors, count < 1);
    });
  },
}];
const onRebuild = (errors, first) => {
  if (errors.length) {
    return log(`${first ? `first ` : ``}esbuild [JQL class free] -> not ok!`);
  }
  log(`${first ? `first ` : ``}esbuild [JQL class free] -> ok`);
};
const ctx = await builder.context({...esContext, plugins });
await ctx.watch();
process.on(`exit`, () => ctx.dispose());