package com.devopssuite.notification.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Sends HTML email notifications.
 *
 * <p>This service is optional — if {@code spring.mail.host} is not configured,
 * {@link JavaMailSender} will not be auto-configured by Spring Boot and this
 * service degrades gracefully (all sends are no-ops, logged as warnings).</p>
 *
 * <p>For local dev, use Mailtrap (sandbox.smtp.mailtrap.io) so emails are
 * captured without being delivered to real addresses.</p>
 */
@Service
@Slf4j
public class EmailNotificationService {

    /** Injected as optional — may be null when SMTP is not configured. */
    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@devopssuite.local}")
    private String fromAddress;

    /**
     * {@code required = false} so the service still loads (and no-ops) when
     * {@code spring.mail.host} is empty and Spring Boot skips mail auto-config.
     */
    @Autowired(required = false)
    public EmailNotificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Sends an HTML notification email. Failures are caught and logged — they
     * must never propagate and roll back the calling transaction.
     *
     * @param toEmail   recipient address
     * @param subject   email subject line
     * @param htmlBody  full HTML body (inline CSS recommended for client compat)
     */
    public void sendNotificationEmail(String toEmail, String subject, String htmlBody) {
        if (mailSender == null) {
            log.debug("Mail sender not configured — skipping email to {}: {}", toEmail, subject);
            return;
        }
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Cannot send email: recipient address is blank (subject={})", subject);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = isHtml
            mailSender.send(message);
            log.debug("Email sent to {} — subject: {}", toEmail, subject);
        } catch (MessagingException e) {
            log.warn("Failed to send email to {} (subject={}): {}", toEmail, subject, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending email to {}: {}", toEmail, e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Pre-built templates for each notification type
    // -------------------------------------------------------------------------

    public void sendTaskAssignedEmail(String toEmail, String taskTitle, String projectName) {
        String subject = "New Task Assigned: " + taskTitle;
        String body = buildEmailTemplate(
                "New Task Assigned",
                "You have been assigned a new task.",
                "<p>Task: <strong>" + escapeHtml(taskTitle) + "</strong></p>" +
                "<p>Project: <strong>" + escapeHtml(projectName) + "</strong></p>",
                "#6366f1"
        );
        sendNotificationEmail(toEmail, subject, body);
    }

    public void sendTaskReassignedEmail(String toEmail, String taskTitle, String projectName) {
        String subject = "Task Reassigned to You: " + taskTitle;
        String body = buildEmailTemplate(
                "Task Reassigned",
                "A task has been reassigned to you.",
                "<p>Task: <strong>" + escapeHtml(taskTitle) + "</strong></p>" +
                "<p>Project: <strong>" + escapeHtml(projectName) + "</strong></p>",
                "#6366f1"
        );
        sendNotificationEmail(toEmail, subject, body);
    }

    public void sendTaskCompletedEmail(String toEmail, String taskTitle) {
        String subject = "Task Completed: " + taskTitle;
        String body = buildEmailTemplate(
                "Task Completed",
                "A task in your project has been marked as done.",
                "<p>Task: <strong>" + escapeHtml(taskTitle) + "</strong></p>",
                "#22c55e"
        );
        sendNotificationEmail(toEmail, subject, body);
    }

    public void sendProjectJoinedEmail(String toEmail, String projectName, String role) {
        String subject = "You've been added to project: " + projectName;
        String body = buildEmailTemplate(
                "Added to Project",
                "You are now a member of a new project.",
                "<p>Project: <strong>" + escapeHtml(projectName) + "</strong></p>" +
                "<p>Your role: <strong>" + escapeHtml(role) + "</strong></p>",
                "#22c55e"
        );
        sendNotificationEmail(toEmail, subject, body);
    }

    public void sendRoleChangedEmail(String toEmail, String projectName, String newRole) {
        String subject = "Your role has changed in: " + projectName;
        String body = buildEmailTemplate(
                "Project Role Updated",
                "Your role in a project has been updated.",
                "<p>Project: <strong>" + escapeHtml(projectName) + "</strong></p>" +
                "<p>New role: <strong>" + escapeHtml(newRole) + "</strong></p>",
                "#f59e0b"
        );
        sendNotificationEmail(toEmail, subject, body);
    }

    public void sendProjectRemovedEmail(String toEmail, String projectName) {
        String subject = "You've been removed from: " + projectName;
        String body = buildEmailTemplate(
                "Removed from Project",
                "You have been removed from a project.",
                "<p>Project: <strong>" + escapeHtml(projectName) + "</strong></p>",
                "#ef4444"
        );
        sendNotificationEmail(toEmail, subject, body);
    }

    public void sendExecutionFailedEmail(String toEmail, String status) {
        String subject = "Code Execution Failed (" + status + ")";
        String body = buildEmailTemplate(
                "Code Execution Failed",
                "Your recent code execution did not complete successfully.",
                "<p>Status: <strong>" + escapeHtml(status) + "</strong></p>" +
                "<p>Please review your code and try again.</p>",
                "#ef4444"
        );
        sendNotificationEmail(toEmail, subject, body);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Builds a simple, inbox-friendly HTML email using inline CSS.
     *
     * @param title       big heading inside the card
     * @param subtitle    one-liner below the heading
     * @param bodyContent inner HTML detail rows
     * @param accentColor hex colour for the top border and heading
     */
    private String buildEmailTemplate(String title, String subtitle,
                                      String bodyContent, String accentColor) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f5f7;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
                    <tr><td align="center">
                      <table width="600" cellpadding="0" cellspacing="0"
                             style="background:#ffffff;border-radius:8px;overflow:hidden;
                                    box-shadow:0 2px 8px rgba(0,0,0,.08);">
                        <!-- Accent bar -->
                        <tr><td style="background:%s;height:4px;"></td></tr>
                        <!-- Header -->
                        <tr><td style="padding:32px 40px 0;">
                          <h1 style="margin:0;font-size:20px;font-weight:700;color:%s;">%s</h1>
                          <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">%s</p>
                        </td></tr>
                        <!-- Body -->
                        <tr><td style="padding:24px 40px;">
                          <div style="font-size:14px;color:#374151;line-height:1.6;">
                            %s
                          </div>
                        </td></tr>
                        <!-- Footer -->
                        <tr><td style="padding:16px 40px 32px;border-top:1px solid #f0f0f0;">
                          <p style="margin:0;font-size:12px;color:#9ca3af;">
                            This notification was sent by DevOps Suite. You received it because
                            an action was performed on your account or a project you belong to.
                          </p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(accentColor, accentColor, title, subtitle, bodyContent);
    }

    /** Minimal HTML escaping to prevent injection in template strings. */
    private String escapeHtml(String input) {
        if (input == null) return "";
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }
}
