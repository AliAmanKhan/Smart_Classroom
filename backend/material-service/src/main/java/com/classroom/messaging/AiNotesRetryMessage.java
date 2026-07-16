package com.classroom.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiNotesRetryMessage implements Serializable {
    private Long materialId;
    private int retryCount;
}
