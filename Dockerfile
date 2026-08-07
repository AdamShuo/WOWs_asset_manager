# 战舰世界资产管理器 —— 零依赖 Node 镜像
FROM node:18-alpine

WORKDIR /app

# 仅复制运行所需文件（.dockerignore 已排除 .git / save / _backups 等）
COPY package.json server.js ./
COPY public ./public

# 端口由平台以环境变量注入；默认 8787
ENV PORT=8787
EXPOSE 8787

# 数据目录：容器内 /data，挂载持久卷到此路径并设置 SAVE_DIR=/data 即可
ENV SAVE_DIR=/data
VOLUME ["/data"]

CMD ["node", "server.js"]
