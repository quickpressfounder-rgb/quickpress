module.exports = {
  apps: [
    {
      name: "quickpress-admin",
      cwd: __dirname,
      script: ".output/server/index.mjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 8084,
        NITRO_PORT: 8084,
        HOST: "127.0.0.1",
        NITRO_HOST: "127.0.0.1"
      }
    }
  ]
};
