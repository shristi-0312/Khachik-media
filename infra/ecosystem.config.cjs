module.exports = {
  apps: [
    {
      name: 'khachik-api',
      cwd: '/opt/khachik-media/khachik-media-api',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
