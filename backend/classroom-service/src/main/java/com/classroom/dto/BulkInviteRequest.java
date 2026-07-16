package com.classroom.dto;

import lombok.Data;
import java.util.List;

@Data
public class BulkInviteRequest {
    private List<String> emails;
    private String role;
}
