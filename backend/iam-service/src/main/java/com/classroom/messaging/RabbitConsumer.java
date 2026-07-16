package com.classroom.messaging;

import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class RabbitConsumer {

    // Optional — service boots even without SMTP configuration
    @Autowired(required = false)
    private JavaMailSender mailSender;

    @RabbitListener(queuesToDeclare = @Queue("password-reset-queue"))
    public void processPasswordReset(RabbitPasswordResetMessage message) {
        log.info("Received password reset message for: {}", message.getEmail());

        if (mailSender == null) {
            log.warn("JavaMailSender is not configured. Skipping password reset email for: {}. " +
                    "Set SPRING_MAIL_HOST, SPRING_MAIL_USERNAME and SPRING_MAIL_PASSWORD in your environment to enable emails.",
                    message.getEmail());
            return;
        }

        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(message.getEmail());
            mailMessage.setSubject("Password Reset Request");
            mailMessage.setText("Hi " + message.getUserName() + ",\n\n" +
                    "We received a request to reset your password. Use the following code to reset your password:\n\n" +
                    message.getResetToken() + "\n\n" +
                    "If you didn't request this, you can safely ignore this email.\n\n" +
                    "Thanks,\nSmart Classroom Team");

            mailSender.send(mailMessage);
            log.info("Successfully sent password reset email to: {}", message.getEmail());
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}. Error: {}", message.getEmail(), e.getMessage());
        }
    }

    @RabbitListener(queuesToDeclare = @Queue("welcome-email-queue"))
    public void processWelcomeEmail(RabbitWelcomeMessage message) {
        log.info("Received welcome email message for: {}", message.getEmail());

        if (mailSender == null) {
            log.warn("JavaMailSender is not configured. Skipping welcome email for: {}", message.getEmail());
            return;
        }

        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(message.getEmail());
            mailMessage.setSubject("Welcome to Smart Classroom!");
            
            String roleText = "TEACHER".equalsIgnoreCase(message.getRole()) 
                    ? "As a teacher, you can now create classrooms, upload materials, and assign tasks to your students."
                    : "As a student, you can now join classrooms, view materials, and submit assignments.";
                    
            mailMessage.setText("Hi " + message.getUserName() + ",\n\n" +
                    "Welcome to Smart Classroom! We're thrilled to have you on board.\n\n" +
                    roleText + "\n\n" +
                    "Get started by logging into your account.\n\n" +
                    "Thanks,\nSmart Classroom Team");

            mailSender.send(mailMessage);
            log.info("Successfully sent welcome email to: {}", message.getEmail());
        } catch (Exception e) {
            log.error("Failed to send welcome email to: {}. Error: {}", message.getEmail(), e.getMessage());
        }
    }
}
