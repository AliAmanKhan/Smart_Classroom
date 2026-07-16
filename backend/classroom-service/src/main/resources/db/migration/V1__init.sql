CREATE TABLE `classrooms` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` bit(1) NOT NULL,
  `class_code` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `invite_link` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `teacher_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_classrooms_class_code` (`class_code`),
  UNIQUE KEY `UK_classrooms_invite_link` (`invite_link`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `classroom_coteachers` (
  `classroom_id` bigint NOT NULL,
  `coteacher_id` bigint DEFAULT NULL,
  KEY `FK_classroom_coteachers_classroom` (`classroom_id`),
  CONSTRAINT `FK_classroom_coteachers_classroom` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `classroom_students` (
  `classroom_id` bigint NOT NULL,
  `student_id` bigint DEFAULT NULL,
  KEY `FK_classroom_students_classroom` (`classroom_id`),
  CONSTRAINT `FK_classroom_students_classroom` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
