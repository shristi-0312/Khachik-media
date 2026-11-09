module.exports = {
  apps: [
    {
      name: 'khachik-api',
      cwd: '/opt/khachik-media/khachik-media-api',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--import dotenv/config',
      env: {
        NODE_ENV: 'production',
        DOTENV_CONFIG_PATH: '/opt/khachik-media/khachik-media-api/.env',
      },
    },
  ],
}
