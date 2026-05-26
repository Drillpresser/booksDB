// Supabase's CJS bundle contains `import('@opentelemetry/api')` for lazy tracing.
// Hermes rejects import() at bytecode-compile time, so we replace any dynamic
// import() call inside @supabase packages with Promise.resolve(null).
function stubSupabaseDynamicImports({ types: t }) {
  return {
    visitor: {
      CallExpression(path, state) {
        if (
          path.node.callee.type === 'Import' &&
          state.filename &&
          state.filename.includes('/@supabase/')
        ) {
          path.replaceWith(
            t.callExpression(
              t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
              [t.nullLiteral()]
            )
          );
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [stubSupabaseDynamicImports],
  };
};
