module.exports = {
  apps: [
    {
      name: "garhu_backend",
      script: "/Users/buyanaa/Desktop/garhu_backend/index.ts",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      args: "--sticky",
    },
  ],
};
