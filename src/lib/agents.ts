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

export function getDefaultAgent1(): AgentConfig {
  return {
    id: 'datacrumbs',
    name: 'DataCrumbs AI Bootcamp (Zoya)',
    phoneNumberId: process.env.PHONE_NUMBER_ID || '1262177280310159',
    systemPrompt: CORE_SYSTEM_PROMPT,
    welcomeGreeting: WELCOME_GREETING,
    brochureUrl: 'https://agent.datacrumbs.org/brochure.pdf',
    brochureFilename: 'DataCrumbs-Bootcamp-Brochure.pdf',
    paymentDetails: {
      bankName: process.env.PAYMENT_BANK_NAME || 'HabibMetro Bank',
      accountTitle: process.env.PAYMENT_BANK_TITLE || 'Data Crumbs',
      iban: process.env.PAYMENT_BANK_IBAN || 'PK61 MPBL 0165 0271 4028 0184',
      accountNumber: process.env.PAYMENT_BANK_ACCOUNT || '6016520311714280184',
      walletTitle: process.env.PAYMENT_WALLET_TITLE || 'Abis Hussain Syed',
      walletNumber: process.env.PAYMENT_WALLET_NUMBER || '0336-2507273',
      fee: process.env.PAYMENT_FEE || 'Rs. 7,499/month',
    },
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
