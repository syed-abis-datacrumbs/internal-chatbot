import { CORE_SYSTEM_PROMPT, WELCOME_GREETING } from './knowledge';

export interface AgentConfig {
  id: string;
  name: string;
  phoneNumberId: string;
  systemPrompt: string;
  welcomeGreeting: string;
  brochureUrl?: string;
  brochureFilename?: string;
  paymentDetails?: {
    bankName?: string;
    accountTitle?: string;
    iban?: string;
    accountNumber?: string;
    walletTitle?: string;
    walletNumber?: string;
    fee?: string;
  };
}

export const INTERNSHIP_WELCOME_GREETING = `Hello! 👋 Welcome to the *Cortexa AI Changemakers Internship 2026*! 🚀

I'm here to assist you with everything about the program:
• 11 Internship Tracks (AI, Software Engineering, Cybersecurity, Marketing, HR, Product, and more)
• 20 Real-World Capstone Projects
• Required Tech Stacks & Tools
• Deliverables & Submission Guidelines

Official Portal: https://internship.datacrumbs.org

How can I help you today? Feel free to ask about any track or project! 😊`;

export function getDefaultAgent1(): AgentConfig {
  return {
    id: 'cortexa_internship',
    name: 'Cortexa AI Internship Assistant',
    phoneNumberId: process.env.PHONE_NUMBER_ID || '1374955249033565',
    systemPrompt: `You are the official Cortexa AI Internship Assistant for Cortexa AI Changemakers Internship 2026. The internship runs for 4 weeks with real-world capstone projects across 11 technical and business domains.`,
    welcomeGreeting: INTERNSHIP_WELCOME_GREETING,
    brochureUrl: undefined,
    brochureFilename: undefined,
  };
}

export function getCustomAgent2(): AgentConfig {
  const phoneId2 = process.env.PHONE_NUMBER_ID_2 || process.env.PHONE_NUMBER_ID_AGENT_2 || '';
  const agentName = process.env.AGENT_2_NAME || 'AI Business Assistant';

  const defaultAgent2Prompt = process.env.AGENT_2_SYSTEM_PROMPT || `You are a helpful, professional, and friendly AI sales and customer support assistant.
Your goal is to answer questions directly, explain services and pricing clearly, and assist customers with booking, inquiries, and orders.
Keep responses concise, polite, and formatted cleanly for mobile reading on WhatsApp.
If asked something outside your business scope, politely guide the customer back to your primary services.`;

  const defaultAgent2Greeting = process.env.AGENT_2_GREETING || `Hello! 👋 Welcome! How can I assist you today?`;

  return {
    id: 'custom_agent_2',
    name: agentName,
    phoneNumberId: phoneId2,
    systemPrompt: defaultAgent2Prompt,
    welcomeGreeting: defaultAgent2Greeting,
    paymentDetails: {
      bankName: process.env.AGENT_2_PAYMENT_BANK || process.env.PAYMENT_BANK_NAME,
      accountTitle: process.env.AGENT_2_PAYMENT_TITLE || process.env.PAYMENT_BANK_TITLE,
      iban: process.env.AGENT_2_PAYMENT_IBAN || process.env.PAYMENT_BANK_IBAN,
      accountNumber: process.env.AGENT_2_PAYMENT_ACCOUNT || process.env.PAYMENT_BANK_ACCOUNT,
      fee: process.env.AGENT_2_FEE || process.env.PAYMENT_FEE,
    },
  };
}

/**
 * Resolves which agent configuration to use based on the Meta Phone Number ID that received the webhook message.
 */
export function getAgentByPhoneId(receivedPhoneId?: string): AgentConfig {
  const agent1 = getDefaultAgent1();
  const agent2 = getCustomAgent2();

  if (!receivedPhoneId) return agent1;

  // Match Agent 2 if configured and received ID matches
  if (agent2.phoneNumberId && receivedPhoneId.trim() === agent2.phoneNumberId.trim()) {
    return agent2;
  }

  // Default to Agent 1
  return agent1;
}
