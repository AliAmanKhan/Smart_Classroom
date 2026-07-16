CREATE TABLE `assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_path` varchar(255) DEFAULT NULL,
  `classroom_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `deadline` datetime(6) NOT NULL,
  `description` varchar(2000) DEFAULT NULL,
  `max_points` int NOT NULL,
  `published` bit(1) NOT NULL,
  `title` varchar(255) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `submissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `assignment_id` bigint NOT NULL,
  `comment` varchar(2000) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `graded_at` datetime(6) DEFAULT NULL,
  `points` int DEFAULT NULL,
  `status` enum('GRADED','LATE','SUBMITTED') DEFAULT NULL,
  `student_id` bigint NOT NULL,
  `submitted_at` datetime(6) NOT NULL,
  `teacher_feedback` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
