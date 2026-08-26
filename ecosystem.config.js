module.exports = {
  apps: [
    {
      name: "bckertost-bot",
      script: "npm",
      args: "run start",
      // Update `cwd` to the path where you clone the repo on your Pi, e.g. '/home/pi/bckertost-bot'
      cwd: ".",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
