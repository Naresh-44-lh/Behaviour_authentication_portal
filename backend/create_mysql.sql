-- Run this script in your MySQL server to create the database and tables manually
CREATE DATABASE IF NOT EXISTS `auth_portal` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `auth_portal`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(255),
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `login_activity` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `username` VARCHAR(100),
  `login_time` DATETIME,
  `ip_address` VARCHAR(100),
  `device` VARCHAR(500),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert demo accounts (passwords must be bcrypt hashes). Use the backend seeding or create your own hashes:
-- INSERT INTO users (username, email, password, role) VALUES ('admin', 'admin@example.com', '<bcrypt-hash>', 'admin');
-- INSERT INTO users (username, email, password, role) VALUES ('user1', 'user1@example.com', '<bcrypt-hash>', 'user');
