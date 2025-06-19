import OpenAI from 'openai';
import { logger } from '../utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  tokenCount?: number;
  model: string;
  processingTime: number;
}

export class AIService {
  private systemPrompt = `You are Angira, an AI-powered educational assistant designed to help students learn effectively. You specialize in:

1. Answering academic questions with clear, detailed explanations
2. Creating educational content like flashcards, mind maps, and quizzes
3. Summarizing complex topics
4. Providing study strategies and learning techniques
5. Adapting explanations to different learning levels

Always provide:
- Clear, accurate information
- Step-by-step explanations when appropriate  
- Multiple perspectives on complex topics
- Practical examples and applications
- Encouraging and supportive tone

Focus on helping students understand concepts deeply rather than just providing answers.`;

  async generateChatResponse(
    messages: ChatMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const {
        model = 'gpt-3.5-turbo',
        maxTokens = 1500,
        temperature = 0.7
      } = options;

      const chatMessages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
        ...messages
      ];

      const completion = await openai.chat.completions.create({
        model,
        messages: chatMessages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      });

      const processingTime = Date.now() - startTime;
      const content = completion.choices[0]?.message?.content || '';
      const tokenCount = completion.usage?.total_tokens;

      logger.info(`AI Response generated: ${tokenCount} tokens, ${processingTime}ms`);

      return {
        content,
        tokenCount,
        model,
        processingTime
      };
    } catch (error: any) {
      logger.error('OpenAI API Error:', error);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  async generateFlashcards(topic: string, count: number = 5): Promise<AIResponse> {
    const prompt = `Create ${count} educational flashcards about "${topic}". 
    Format each flashcard as:
    Q: [Question]
    A: [Answer]
    
    Make sure the questions test understanding, not just memorization. Include a mix of:
    - Definition questions
    - Application questions  
    - Comparison questions
    - Analysis questions`;

    return this.generateChatResponse([
      { role: 'user', content: prompt }
    ], { temperature: 0.6 });
  }

  async generateMindMap(topic: string): Promise<AIResponse> {
    const prompt = `Create a comprehensive mind map structure for "${topic}". 
    Format it as a hierarchical outline with main branches and sub-branches:
    
    # ${topic}
    ## Main Branch 1
    - Sub-point 1.1
    - Sub-point 1.2
    ## Main Branch 2
    - Sub-point 2.1
    - Sub-point 2.2
    
    Include key concepts, relationships, and important details.`;

    return this.generateChatResponse([
      { role: 'user', content: prompt }
    ], { temperature: 0.5 });
  }

  async generateQuiz(topic: string, questionCount: number = 5): Promise<AIResponse> {
    const prompt = `Create a ${questionCount}-question quiz about "${topic}".
    Include a mix of question types:
    - Multiple choice (with 4 options)
    - True/False  
    - Short answer
    
    Format:
    1. [Question Type] [Question]
    a) Option A
    b) Option B  
    c) Option C
    d) Option D
    Correct Answer: [Letter or True/False or Short Answer]
    
    Make questions challenging but fair, testing real understanding.`;

    return this.generateChatResponse([
      { role: 'user', content: prompt }
    ], { temperature: 0.6 });
  }

  async generateSummary(content: string, maxLength: string = 'medium'): Promise<AIResponse> {
    let lengthInstruction = '';
    switch (maxLength) {
      case 'short':
        lengthInstruction = 'in 2-3 concise paragraphs';
        break;
      case 'long':
        lengthInstruction = 'in 5-7 detailed paragraphs';
        break;
      default:
        lengthInstruction = 'in 3-4 well-structured paragraphs';
    }

    const prompt = `Summarize the following content ${lengthInstruction}. 
    Focus on the key points, main concepts, and important details:
    
    ${content}`;

    return this.generateChatResponse([
      { role: 'user', content: prompt }
    ], { temperature: 0.4 });
  }

  async createLeitnerBox(topic: string): Promise<AIResponse> {
    const prompt = `Create a Leitner Box system for learning "${topic}". 
    Organize content into 5 boxes (Box 1 = daily review, Box 5 = monthly review):
    
    BOX 1 (Daily Review - New/Difficult):
    - [Fundamental concepts that need daily practice]
    
    BOX 2 (Every 2 Days - Getting Familiar):
    - [Concepts becoming familiar]
    
    BOX 3 (Weekly - Moderately Known):
    - [Well-understood concepts]
    
    BOX 4 (Bi-weekly - Well Known):
    - [Almost mastered concepts]
    
    BOX 5 (Monthly - Mastered):
    - [Fully understood concepts]
    
    Include specific items for each box with brief explanations.`;

    return this.generateChatResponse([
      { role: 'user', content: prompt }
    ], { temperature: 0.5 });
  }

  async analyzeFile(fileContent: string, fileName: string): Promise<AIResponse> {
    const prompt = `Analyze the following file content from "${fileName}" and provide:
    1. A brief summary of the content
    2. Key topics and concepts covered
    3. Potential study questions based on the content
    4. Suggestions for further learning
    
    File content:
    ${fileContent}`;

    return this.generateChatResponse([
      { role: 'user', content: prompt }
    ], { maxTokens: 2000, temperature: 0.4 });
  }
}

export const aiService = new AIService(); 