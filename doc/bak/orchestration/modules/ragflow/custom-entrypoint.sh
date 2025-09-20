#!/bin/bash

# 设置nginx配置
echo "Setting up nginx configuration..."
if [ -f /etc/nginx/sites-available/ragflow ]; then
    # 删除默认站点配置
    rm -f /etc/nginx/sites-enabled/default
    # 启用RagFlow配置
    ln -sf /etc/nginx/sites-available/ragflow /etc/nginx/sites-enabled/ragflow
    echo "Nginx configuration updated for RagFlow"
    
    # 测试nginx配置
    nginx -t
    if [ $? -ne 0 ]; then
        echo "Nginx configuration test failed!"
        exit 1
    fi
fi

# 调用原始entrypoint
exec /ragflow/entrypoint.sh "$@"