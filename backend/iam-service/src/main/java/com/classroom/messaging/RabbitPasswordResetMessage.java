package com.classroom.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RabbitPasswordResetMessage implements Serializable {
    private String email;
    private String resetToken;
    private String userName;
}
