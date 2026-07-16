package com.classroom.service;

public class PromptTemplates {
    public static final String GENERATE_NOTES_PROMPT = """
            You are an educational assistant helping students learn efficiently.
            
            Video Title: %s
            
            Transcript:
            %s
            
            Please create:
            1. A brief summary (2-3 sentences)
            2. Key concepts and main ideas
            3. Important definitions
            4. Main takeaways
            5. Important formulas/examples
            
            Format the output in clean Markdown. Use headings, bold text, and bullet points to make it easy to read.
            """;

    public static final String CHUNK_SUMMARIZE_PROMPT = """
            You are an educational assistant helping students learn efficiently.
            You are processing a part of a larger video transcript.

            Video Title: %s
            
            Chunk Transcript:
            %s
            
            Please extract and summarize the important information from this specific chunk.
            Include:
            1. Key concepts discussed in this chunk
            2. Important definitions or facts
            3. Formulas or examples if present
            
            Format the output in clean Markdown with appropriate headings and bullet points.
            Do not add introductory or concluding remarks, just the raw notes.
            """;

    public static final String FINAL_POLISH_PROMPT = """
            You are an educational assistant helping students learn efficiently.
            Below are study notes generated from multiple parts of a video transcript. They have been combined, but they might contain duplicate information or lack flow between sections.

            Video Title: %s
            
            Combined Notes:
            %s
            
            Please create a final, polished, and comprehensive study guide by:
            1. Removing duplicate information across sections.
            2. Improving the flow and organization of topics.
            3. Normalizing the headings into a logical hierarchy (e.g., # Main Topic, ## Sub Topic).
            4. Creating a brief overall summary (2-3 sentences) at the very beginning.
            5. Preserving ALL important concepts, definitions, takeaways, and formulas/examples from the combined notes.

            Format the output in clean Markdown. Use headings, bold text, and bullet points to make it easy to read.
            """;
}
