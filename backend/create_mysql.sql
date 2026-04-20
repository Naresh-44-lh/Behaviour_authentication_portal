-- Simply Safe Authentication & Metrics Portal
-- Run this script in your MySQL server to create the database and tables
CREATE DATABASE IF NOT EXISTS `simply_safe` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `simply_safe`;

-- Users table with roles (admin, faculty, student) and security tracking
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `email` VARCHAR(255),
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','faculty','student') DEFAULT 'student',
  `is_blocked` BOOLEAN DEFAULT FALSE,
  `failed_attempts` INT DEFAULT 0,
  `is_temporary` BOOLEAN DEFAULT FALSE,
  `expires_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_general_ci;

-- Login activity table with location tracking and Antigravity status
CREATE TABLE IF NOT EXISTS `login_activity` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `username` VARCHAR(255),
  `login_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `location` VARCHAR(255) NULL,
  `ip_address` VARCHAR(255),
  `device` VARCHAR(500),
  `status` VARCHAR(50) DEFAULT 'Normal',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_login_time (login_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_general_ci;

-- User metrics table for typing speed and mouse movement tracking
CREATE TABLE IF NOT EXISTS `user_metrics` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `username` VARCHAR(255),
  `typing_speed` DOUBLE,
  `mouse_movements` INT,
  `recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_general_ci;

-- Student records table for marks and attendance tracking
CREATE TABLE IF NOT EXISTS `student_records` (
  `id` INT xPRIMARY KEY AUTO_INCREMENT,
  `user_id` INT UNIQUE,
  `marks` VARCHAR(255) DEFAULT 'Not graded',
  `days_present` INT DEFAULT 0,
  `days_absent` INT DEFAULT 0,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_general_ci;
-- Demo accounts (use backend seeding or insert manually with bcrypt hashes):
-- Admin: admin / admin123
-- Student: student1 / user123
-- Faculty: faculty1 / pass123
