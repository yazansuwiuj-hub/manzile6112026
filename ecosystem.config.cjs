module.exports = {
  apps: [
    {
      name: 'manzile',
      cwd: '/var/www/manzile',
      script: 'dist/server.cjs',
      exec_mode: 'fork',
      instances: 1,
      env_production: {
        NODE_ENV: 'production',
        PORT: '2468'
      }
    }
  ]
};
