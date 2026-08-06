# DataCrumbs WhatsApp Chatbot — Comprehensive Test Cases

This document details all functional, conversational, and state-machine test cases for validating the **DataCrumbs WhatsApp AI Sales & Enrollment Assistant**.

---

## 1. Greetings & Initial Interaction

| Test ID | Test Scenario | User Input | Expected Bot Behavior / Response | Status |
|---|---|---|---|---|
| **TC-01** | Pure English Greeting | `hi` / `hello` / `hey` | Replies with the **Official Initial Greeting Block**, including program overview, 16th August start date, LMS/brochure links, community groups, and option list. | 🟩 Pass |
| **TC-02** | Islamic Greeting | `Assalamu Alaikum` / `AOA` / `Assallamo Allikum` | Replies starting with **"Wa Alaikum Assalam"**. Does NOT repeat the user's greeting back or say "Assalam o Alaikum". | 🟩 Pass |
| **TC-03** | Greeting + Question | `Hi, what is the fee for the course?` | **Skips initial greeting block completely**. Answers the fee question directly (Rs. 7,499/mo + value justification). | 🟩 Pass |
| **TC-04** | Mid-Conversation Greeting | User says `hi there` after conversation started | Does **NOT** repeat the full greeting block. Replies with a friendly greeting and asks how it can help. | 🟩 Pass |

---

## 2. General Knowledge & Curriculum Q&A

| Test ID | Test Scenario | User Input | Expected Bot Behavior / Response | Status |
|---|---|---|---|---|
| **TC-05** | Fee & Pricing Query | `What is the total fee?` | States **Rs. 7,499/month**, highlights ROI (guaranteed 1-2 month internship, 2 certificates, GenAI/Agentic AI skills, 1-Year LMS + 7-Day Guarantee). | 🟩 Pass |
| **TC-06** | 7-Day Money-Back Guarantee | `Is there a money back guarantee?` | Mentions **7-Day Money-Back Guarantee** (no longer 30 days). | 🟩 Pass |
| **TC-07** | Course Duration | `How long is the bootcamp?` | Mentions BOTH **4 Months (16 Weeks) Bootcamp** + **1 to 2 Months Guaranteed Industry Internship**. | 🟩 Pass |
| **TC-08** | Class Timings | `When are the classes held?` | Saturday & Sunday, **4:00 PM – 5:30 PM** live on Zoom + crisp recordings on Cognos LMS. | 🟩 Pass |
| **TC-09** | Hardware Requirements | `Do I need a GPU laptop?` | Basic Core 2 Duo laptop is enough. Heavy AI models run on cloud (Google Colab). | 🟩 Pass |
| **TC-10** | Sample Projects Query | `What real projects will I build?` | Mentions Chatbots, AI Voice Agents (ElevenLabs/Twilio), Social Media Automation (n8n), Web Scraping (Playwright), Computer Vision (YOLO), and Vercel + Supabase deployment. | 🟩 Pass |
| **TC-11** | Off-Topic Handling | `Who won the cricket match yesterday?` | Politely declines non-DataCrumbs topics and redirects user back to the AI & Data Science Bootcamp. | 🟩 Pass |

---

## 3. In-Chat Enrollment Flow & State Machine

| Test ID | Test Scenario | User Input | Expected Bot Behavior / Response | Status |
|---|---|---|---|---|
| **TC-12** | Enrollment Trigger | `I want to enroll` / `Register me` | Starts `collecting_name` state. Asks for full name and email address in-chat without sending external forms. | 🟩 Pass |
| **TC-13** | Name & Email in One Message | `Syed Abis, abis@gmail.com` | Captures both `Syed Abis` and `abis@gmail.com`. Transitions state to `awaiting_screenshot` and sends bank/wallet details. | 🟩 Pass |
| **TC-14** | Multi-Message Enrollment | Message 1: `Syed Abis`<br>Message 2: `abis@gmail.com` | Step 1 captures name (`collecting_email`). Step 2 captures email (`awaiting_screenshot`). Sends payment details. | 🟩 Pass |
| **TC-15** | Image Sent Before Name/Email | User uploads an image while in `collecting_name` | Saves image for display, reminds user to provide full name & email first before proceeding to payment. | 🟩 Pass |

---

## 4. Conversational Intelligence & Name Protection

| Test ID | Test Scenario | User Input | Expected Bot Behavior / Response | Status |
|---|---|---|---|---|
| **TC-16** | Explicit In-Chat Name | `Hi, my name is Syed Abis` | Stores `Syed Abis` in contact profile. Uses `Syed Abis` throughout enrollment without asking again. | 🟩 Pass |
| **TC-17** | General Query During Enrollment | `Tell me something related to internship?` while in enrollment state | Bot answers the internship question via Gemini. **Does NOT corrupt user's name** with the question string. | 🟩 Pass |
| **TC-18** | Meta Username Ignored | WhatsApp profile name is `A.S` or phone number | Does NOT auto-assign Meta profile names. Only uses explicitly stated names from chat messages. | 🟩 Pass |
| **TC-19** | Missing Name Fallback | User gave email but never gave name | Says *"Thank you! We're excited to have you join DataCrumbs 🚀"*. **NEVER uses "Student"** or placeholder strings. | 🟩 Pass |

---

## 5. Payment Screenshot Verification (`awaiting_screenshot` & `screenshot_received`)

| Test ID | Test Scenario | User Input | Expected Bot Behavior / Response | Status |
|---|---|---|---|---|
| **TC-20** | Uploading Payment Image | User sends image in `awaiting_screenshot` state | Uploads image to Google Drive, updates session to `screenshot_received`, sends receipt confirmation with LMS link. | 🟩 Pass |
| **TC-21** | Neutral Screenshot Receipt Wording | User sends an image (receipt or random photo) | States: *"✅ We've received your image! Our team will review and verify your payment receipt..."* (Does NOT falsely claim it already verified payment). | 🟩 Pass |
| **TC-22** | Pure Greeting in `screenshot_received` | User sends `Hi there` after sending screenshot | Greets naturally back. **Does NOT repeat "We are verifying your payment"** status text. | 🟩 Pass |
| **TC-23** | Asking Questions in `screenshot_received` | `What time are the weekend classes?` | Gemini answers class timings directly. Does not loop payment verification message. | 🟩 Pass |

---

## 6. Financial Assistance & Concession Escalation

| Test ID | Test Scenario | User Input | Expected Bot Behavior / Response | Status |
|---|---|---|---|---|
| **TC-24** | Initial Concession Request | `Can I get a discount?` | Justifies price ROI first, offers 20% Group Discount (groups of 2+). | 🟩 Pass |
| **TC-25** | Persistent Financial Hardship | `I cannot afford 7499, please give concession` | Escalates to management: *"I have noted down your request for our management team. They will reach out to you directly on this WhatsApp number..."* | 🟩 Pass |
| **TC-26** | No Redundant Phone Request | Asking for concession | **NEVER asks for user's phone/contact number** (since they are already on WhatsApp). Offers support contact `+92 329 2020497`. | 🟩 Pass |

---

## 7. Document Shortcuts & Administration

| Test ID | Test Scenario | User Input | Expected Bot Behavior / Response | Status |
|---|---|---|---|---|
| **TC-27** | Brochure Request | `Send brochure` / `pdf` | Sends `brochure.pdf` document asset along with a concise text description. | 🟩 Pass |
| **TC-28** | Human Support Contact | `I want to speak to a human` | Provides human support hotline: **+92 329 2020497**. | 🟩 Pass |
| **TC-29** | Careers / Job Inquiry | `I am looking for a job as an instructor` | States that hiring is prioritized for program graduates, instructs job seekers to email `careers@datacrumbs.org`. | 🟩 Pass |

---

## 8. Summary of Recent Fixes Verified in Codebase

- 🔹 **Name Extraction & Fallback**: `looksLikeName` regex guards against symbols/questions. `'Student'` fallback replaced with clean conditional greetings.
- 🔹 **Meta Profile Ignored**: No longer defaults to Meta WhatsApp profile names. Only explicit in-chat introductions are recorded.
- 🔹 **Receipt Wording Neutralized**: Changed from *"We've received your payment screenshot"* to *"We've received your image! Our team will review and verify your payment receipt"*.
- 🔹 **Greeting Context Lock Removed**: Prompt instructed Gemini to respond naturally to pure greetings like `"Hi there"` without looping payment status text.
- 🔹 **Concession Escalation**: Completely removed redundant phone number collection. Refers users to their active WhatsApp line or `+92 329 2020497`.
