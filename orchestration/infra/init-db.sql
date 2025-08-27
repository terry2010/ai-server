-- 创建 Dify 插件守护进程数据库
-- PostgreSQL 语法 - 先安装 dblink 扩展

-- 先创建 dblink 扩展
CREATE EXTENSION IF NOT EXISTS dblink;

-- 使用 DO 块来条件创建数据库
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ai_server_plugin') THEN
        PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE ai_server_plugin');
    END IF;
END
$$;

-- 如果需要，可以创建专门的用户
-- CREATE USER plugin_user WITH PASSWORD 'plugin_password';
-- GRANT ALL PRIVILEGES ON DATABASE ai_server_plugin TO plugin_user;
