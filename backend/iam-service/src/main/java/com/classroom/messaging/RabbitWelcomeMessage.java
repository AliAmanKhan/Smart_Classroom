package com.classroom.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RabbitWelcomeMessage implements Serializable {
    private String email;
    private String userName;
    private String role;
}
