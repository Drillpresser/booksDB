module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    overrides: [
      {
        // Transform dynamic import() in @supabase packages so Hermes can compile them.
        // Supabase lazily imports @opentelemetry/api via import(), which Hermes rejects.
        include: [/node_modules\/@supabase/],
        plugins: [
          ['@babel/plugin-transform-modules-commonjs', { allowTopLevelThis: true }],
        ],
      },
    ],
  };
};
