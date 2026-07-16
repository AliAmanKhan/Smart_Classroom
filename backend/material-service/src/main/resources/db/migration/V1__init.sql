CREATE TABLE `study_materials` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ai_generated_notes` longtext,
  `classroom_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('FILE','YOUTUBE_VIDEO') NOT NULL,
  `youtube_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
