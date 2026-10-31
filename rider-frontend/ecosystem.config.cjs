module.exports = {
  apps: [
    {
      name: "quickpress-rider",
      cwd: __dirname,
      script: ".output/server/index.mjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 8083,
        NITRO_PORT: 8083,
        HOST: "0.0.0.0",
        NITRO_HOST: "0.0.0.0"
      }
    }
  ]
};
