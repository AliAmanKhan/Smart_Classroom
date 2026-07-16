package com.classroom.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

/**
 * S3-backed file storage service.
 *
 * <p>storeFile  – uploads to S3, returns the S3 object key (stored in DB).
 * <p>generatePresignedUrl – produces a 60-minute pre-signed GET URL for secure, direct download.
 * <p>deleteFile – removes the object from S3.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    /**
     * Uploads a file to S3.
     *
     * @param file         the multipart file to upload
     * @param subDirectory logical prefix inside the bucket (e.g. "assignments", "submissions")
     * @return S3 object key (e.g. "assignments/uuid_filename.pdf")
     */
    public String storeFile(MultipartFile file, String subDirectory) {
        try {
            String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
            
            String lowerCaseName = originalFileName.toLowerCase();
            if (!(lowerCaseName.endsWith(".pdf") || 
                  lowerCaseName.endsWith(".png") || 
                  lowerCaseName.endsWith(".jpg") || 
                  lowerCaseName.endsWith(".jpeg") || 
                  lowerCaseName.endsWith(".zip"))) {
                throw new IllegalArgumentException("Invalid file type. Only PDF, PNG, JPG, and ZIP are allowed.");
            }

            String uniqueKey = subDirectory + "/" + UUID.randomUUID() + "_" + originalFileName;

            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(uniqueKey)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            log.info("File uploaded to S3: s3://{}/{}", bucketName, uniqueKey);
            return uniqueKey;

        } catch (IOException e) {
            log.error("Failed to upload file to S3", e);
            throw new RuntimeException("Could not upload file to S3. Please try again!", e);
        }
    }

    /**
     * Generates a pre-signed GET URL valid for 60 minutes.
     *
     * @param s3Key the S3 object key returned by storeFile()
     * @return a temporary HTTPS URL the client can use to download the file directly from S3
     */
    public String generatePresignedUrl(String s3Key) {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(60))
                .getObjectRequest(getRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        String url = presignedRequest.url().toString();
        log.debug("Generated pre-signed URL for key {}: {}", s3Key, url);
        return url;
    }

    /**
     * Deletes an object from S3.
     *
     * @param s3Key the S3 object key to delete
     */
    public void deleteFile(String s3Key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build());
            log.info("Deleted S3 object: s3://{}/{}", bucketName, s3Key);
        } catch (Exception e) {
            log.error("Failed to delete S3 object: {}", s3Key, e);
        }
    }
}
