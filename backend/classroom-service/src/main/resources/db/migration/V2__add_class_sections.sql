CREATE TABLE `class_sections` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `classroom_id` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_class_sections_classroom` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `class_section_students` (
  `section_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  PRIMARY KEY (`section_id`, `student_id`),
  CONSTRAINT `FK_class_section_students_section` FOREIGN KEY (`section_id`) REFERENCES `class_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
