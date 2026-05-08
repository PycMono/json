## 部署工具

所有脚本在本地执行，通过 SSH 自动操作远程服务器。

## 脚本一览

| 脚本 | 说明 |
|------|------|
| `setup_ssh.sh` | 配置 SSH 免密登录（只需一次） |
| `setup_mysql.sh` | 安装 MySQL，设置 root 密码（已装跳过） |
| `setup_redis.sh` | 安装 Redis，配置密码/安全（已装跳过） |
| `setup_golang.sh` | 安装 Go SDK（版本匹配跳过） |
| `setup_nginx.sh` | 安装 Nginx + Certbot + UFW（已装跳过） |
| `setup_sql_schema.sh` | 首次建表 + 导入初始数据（幂等） |
| `deploy_init.sh` | 一键初始化：调用上面 4 个 setup 组件脚本 |
| `deploy.sh` | 编译打包、上传、重启（日常部署） |
| `exec_sql.sh` | 增量 SQL 执行（MD5 防重复） |

---

## 快速开始

### 1. 配置 SSH

```bash
sh ./deployment/setup_ssh.sh
```

### 2. 初始化组件

```bash
sh ./deployment/deploy_init.sh
```

单独安装某个组件：
```bash
sh ./deployment/setup_mysql.sh
sh ./deployment/setup_redis.sh
sh ./deployment/setup_golang.sh
sh ./deployment/setup_nginx.sh
```

自定义密码/版本：
```bash
MYSQL_ROOT_PASSWORD=xxx sh ./deployment/setup_mysql.sh
REDIS_PASSWORD=xxx sh ./deployment/setup_redis.sh
GO_VERSION=1.24.0 sh ./deployment/setup_golang.sh
```

### 3. 部署应用

```bash
sh ./deployment/deploy.sh
```

### 4. 建表 + 导数据

```bash
sh ./deployment/setup_sql_schema.sh
```

> SSL 由 Cloudflare 处理（Flexible 模式），无需额外申请证书。

---

## 日常更新

```bash
sh ./deployment/deploy.sh
```

---

## 增量 SQL

```bash
sh ./deployment/exec_sql.sh              # 交互选择
sh ./deployment/exec_sql.sh -a           # 执行所有未执行的
sh ./deployment/exec_sql.sh a.sql b.sql  # 指定文件
sh ./deployment/exec_sql.sh -l           # 列出可用文件
sh ./deployment/exec_sql.sh -s           # 查看执行记录
```

---

## 问题排查

```bash
ssh nova "systemctl status freesms"              # 服务状态
ssh nova "journalctl -u freesms -n 50 --no-pager" # 查看日志
ssh nova "systemctl restart freesms"              # 重启服务
ssh nova "ss -tulpn | grep 5001"                 # 检查端口
ssh nova "ls /var/www/freesms/"                  # 项目目录
ssh nova "redis-cli -a 123456 ping"              # Redis 检查
ssh nova "mysql -u root -p123456 -e 'SHOW DATABASES;'" # MySQL 检查
```

连接 MySQL：
```bash
ssh nova
mysql -h 127.0.0.1 -P 3306 -u root -p123456 -D freesms
```
