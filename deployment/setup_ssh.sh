#!/bin/bash

# 这个脚本用于配置 SSH 免密登录，适用于 Linux 和 macOS 用户。
# 自动生成密钥 → 上传公钥 → 写入 ~/.ssh/config

# --- 配置区 ---
REMOTE_USER="root"
SSH_ALIAS="nova"                # SSH 别名

# 交互式输入服务器 IP
read -p "请输入服务器 IP: " REMOTE_HOST
if [ -z "$REMOTE_HOST" ]; then
    echo "❌ IP 不能为空"
    exit 1
fi

echo "🔐 开始配置 SSH 免密登录..."

# 1. 检查本地是否已有密钥，没有则生成
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "📂 未检测到密钥，正在生成 4096 位 RSA 密钥..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
else
    echo "✅ 检测到本地已有密钥，跳过生成步骤。"
fi

# 2. 将公钥上传到服务器
echo "📤 正在将公钥发送到服务器 $REMOTE_HOST..."
echo "🔑 提示：接下来可能会询问一次服务器的登录密码，请输入..."

PUB_KEY=$(cat ~/.ssh/id_rsa.pub)

ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$PUB_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

if [ $? -ne 0 ]; then
    echo "❌ 公钥上传失败，请检查网络或密码是否正确。"
    exit 1
fi

echo "✅ 公钥上传成功"

# 3. 自动写入 ~/.ssh/config（已存在则跳过）
mkdir -p ~/.ssh
chmod 700 ~/.ssh

if grep -q "Host $SSH_ALIAS" ~/.ssh/config 2>/dev/null; then
    echo "✅ ~/.ssh/config 中已存在 $SSH_ALIAS 配置，跳过"
else
    cat >> ~/.ssh/config <<EOF

Host $SSH_ALIAS
    HostName $REMOTE_HOST
    User $REMOTE_USER
    IdentityFile ~/.ssh/id_rsa
EOF
    chmod 600 ~/.ssh/config
    echo "✅ 已写入 ~/.ssh/config"
fi

# 4. 给所有 .sh 文件加执行权限
echo "🔐 为部署脚本添加执行权限..."
find "$(dirname "$0")" -maxdepth 1 -name "*.sh" -exec chmod +x {} \;
echo "✅ 执行权限已添加"

echo "---------------------------------------"
echo "🎉 配置完成！"
echo "测试连接: ssh $SSH_ALIAS"
echo "---------------------------------------"
