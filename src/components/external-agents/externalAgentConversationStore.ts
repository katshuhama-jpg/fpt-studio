// In-memory conversation store for an external agent's History tab — grouped by thread,
// matching the internal agent's Run history (src/components/history/historyStore.ts) exactly:
// the transcript is just the conversation, no per-run metadata. Read-only, like historyStore —
// conversations can't be edited.

export type ExternalAgentChannel = "web" | "zalo" | "messenger" | "slack" | "teams" | "api" | "workspace";

export interface ConversationMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  at: number;
}

export interface ExternalConversation {
  id: string; // threadId
  agentId: string;
  channel: ExternalAgentChannel;
  username: string;
  /** Not every channel captures an email (e.g. anonymous widget chats) — optional on purpose. */
  email?: string;
  startedAt: number;
  endedAt: number;
  messages: ConversationMessage[];
}

const store = new Map<string, ExternalConversation>();
const k = (agentId: string, threadId: string) => `${agentId}:${threadId}`;
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function pseudoUlid(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let x = h || 1;
  let out = "";
  for (let i = 0; i < 26; i++) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    // This LCG's low-order bits have a notoriously short period (the same reason glibc's own
    // rand() discards them) — two different seeds can produce identical `x % 32` sequences for
    // many iterations. Using the top 5 bits instead avoids that collision class.
    out += CROCKFORD_BASE32[(x >>> 27) & 31];
  }
  return out;
}

interface Turn { user: string; agent: string; }

/** Spaces messages 2 minutes apart, ending at `endedAt`. */
function buildMessages(seedKey: string, endedAt: number, turns: Turn[]): ConversationMessage[] {
  const startAt = endedAt - turns.length * 2 * MIN;
  const out: ConversationMessage[] = [];
  turns.forEach((t, i) => {
    const at = startAt + i * 2 * MIN;
    out.push({ id: pseudoUlid(`${seedKey}-u${i + 1}`), role: "user", content: t.user, at });
    out.push({ id: pseudoUlid(`${seedKey}-a${i + 1}`), role: "agent", content: t.agent, at: at + 30_000 });
  });
  return out;
}

interface SeedSpec {
  key: string;
  channel: ExternalAgentChannel;
  username: string;
  email?: string;
  endedAt: number;
  turns: Turn[];
}

function toConversation(agentId: string, s: SeedSpec): ExternalConversation {
  const messages = buildMessages(s.key, s.endedAt, s.turns);
  return {
    id: pseudoUlid(s.key),
    agentId,
    channel: s.channel,
    username: s.username,
    email: s.email,
    startedAt: messages[0]?.at ?? s.endedAt,
    endedAt: s.endedAt,
    messages,
  };
}

/** 14 conversations spread over the last 60 days — 2 today, 3 this week, 9 older — so the
 * time filter has real buckets to filter into. */
function agentTimestamps(now: number): number[] {
  return [
    now - 3 * HOUR,
    now - 7 * HOUR,
    now - 2 * DAY - 4 * HOUR,
    now - 4 * DAY - 2 * HOUR,
    now - 6 * DAY - 5 * HOUR,
    now - 9 * DAY - 3 * HOUR,
    now - 14 * DAY - 6 * HOUR,
    now - 19 * DAY - 1 * HOUR,
    now - 25 * DAY - 4 * HOUR,
    now - 31 * DAY - 2 * HOUR,
    now - 38 * DAY - 5 * HOUR,
    now - 45 * DAY - 3 * HOUR,
    now - 52 * DAY - 2 * HOUR,
    now - 59 * DAY - 4 * HOUR,
  ];
}

/** Flight Assistant (ext-seed-1) — published to Web + Zalo, plus API. 4 short (2-6 msgs),
 * 6 medium (8-16 msgs), 4 long (24-40 msgs). */
function flightAssistantSpecs(now: number): SeedSpec[] {
  const t = agentTimestamps(now);
  return [
    {
      key: "EXT1-CV-01", channel: "web", username: "Nguyen Van An", email: "nguyen.van.an@gmail.com", endedAt: t[0],
      turns: [
        { user: "What's the status of my booking VN5521?", agent: "Booking VN5521 is confirmed — Hanoi to Da Nang, departing tomorrow at 09:15." },
      ],
    },
    {
      key: "EXT1-CV-02", channel: "zalo", username: "Tran Thi Bich", email: "tran.thi.bich@gmail.com", endedAt: t[1],
      turns: [
        { user: "I need a flight from Ho Chi Minh City to Hanoi next Wednesday, one way.", agent: "I found three options — the cheapest is Vietjet at 07:40 for 1,150,000 VND. Would you like me to book it?" },
        { user: "Is there anything in the afternoon instead?", agent: "Yes, Vietnam Airlines has a 14:20 departure for 1,320,000 VND." },
        { user: "Book the afternoon one please.", agent: "Booked — confirmation code VN7734, e-ticket sent to your email." },
        { user: "Perfect, thanks.", agent: "You're welcome — have a great trip!" },
      ],
    },
    {
      key: "EXT1-CV-03", channel: "api", username: "Le Quoc Bao", email: "le.quoc.bao@gmail.com", endedAt: t[2],
      turns: [
        { user: "I need to plan a trip for work, a few cities.", agent: "Happy to help — which cities are you visiting, and in what order?" },
        { user: "Hanoi first, then Da Nang, then back to Ho Chi Minh City.", agent: "Got it. What dates are you thinking for each leg?" },
        { user: "Starting the 5th, maybe 3 days in each city.", agent: "So Hanoi the 5th–8th, Da Nang the 8th–11th, Ho Chi Minh City the 11th onward — is that right?" },
        { user: "Yes exactly.", agent: "Let's start with the first leg — from Ho Chi Minh City to Hanoi on the 5th. There's a 07:15 departure for 1,050,000 VND." },
        { user: "That works, book it.", agent: "Booked — confirmation code VN5540. Next, Hanoi to Da Nang on the 8th — I have a 09:00 flight for 980,000 VND." },
        { user: "Book that one too.", agent: "Done — confirmation code VN5541. Last leg, Da Nang to Ho Chi Minh City on the 11th — there's a 16:30 departure for 1,100,000 VND." },
        { user: "Yes, book it as well.", agent: "All three legs are booked — VN5540, VN5541, VN5542." },
        { user: "Can you also select window seats for all three flights?", agent: "Sure — I've assigned window seats on each leg where available; the Da Nang to Ho Chi Minh City flight only had aisle left." },
        { user: "That's fine, aisle works for that one.", agent: "Understood, keeping the aisle seat for the final leg." },
        { user: "What's the baggage allowance across all three?", agent: "Each leg includes 23kg checked baggage, since they're separate domestic fares." },
        { user: "I'll be carrying camera equipment, can I add extra just for the Hanoi to Da Nang leg?", agent: "Yes, I can add 15kg extra to that leg for 280,000 VND." },
        { user: "Please add that.", agent: "Added — the Hanoi to Da Nang leg now has 38kg checked allowance." },
        { user: "Can you apply my loyalty points to any of these?", agent: "You have 9,200 points, which isn't enough to cover a full fare, so I'll leave all three charged in full for now." },
        { user: "That's fine. Can you send me the full itinerary?", agent: "Sent to your email — Ho Chi Minh City to Hanoi on the 5th, Hanoi to Da Nang on the 8th, Da Nang to Ho Chi Minh City on the 11th, with seat and baggage details included." },
        { user: "Great, thank you for putting that together.", agent: "You're welcome — have a productive trip!" },
      ],
    },
    {
      key: "EXT1-CV-04", channel: "web", username: "Pham Thi Lan", email: "pham.thi.lan@gmail.com", endedAt: t[3],
      turns: [
        { user: "I need to move my flight VN2290 to a later date.", agent: "Sure — VN2290 is currently set for the 12th. Which date would you like instead?" },
        { user: "The 19th if possible.", agent: "The 19th has availability on the same route — there's a fare difference of 220,000 VND plus a 300,000 VND change fee." },
        { user: "That's fine, go ahead.", agent: "Done — VN2290 is now confirmed for the 19th. Updated e-ticket sent." },
        { user: "One more thing — will my seat selection carry over?", agent: "Yes, your window seat in row 14 is preserved on the new flight." },
        { user: "Great, thank you.", agent: "Happy to help — safe travels!" },
      ],
    },
    {
      key: "EXT1-CV-05", channel: "zalo", username: "Hoang Van Duc", email: "hoang.van.duc@gmail.com", endedAt: t[4],
      turns: [
        { user: "Do I have any flights booked this month?", agent: "Yes — one round trip to Phu Quoc, departing the 14th and returning the 18th." },
        { user: "Great, thanks.", agent: "You're welcome — safe travels!" },
      ],
    },
    {
      key: "EXT1-CV-06", channel: "api", username: "Vu Thi Mai", email: "vu.thi.mai@gmail.com", endedAt: t[5],
      turns: [
        { user: "How much extra baggage can I add to booking VN3390?", agent: "You can add up to 20kg extra for 380,000 VND, or 32kg for 620,000 VND." },
        { user: "I'll add the 20kg option.", agent: "Added — your total checked allowance for VN3390 is now 43kg." },
        { user: "Does this apply to my return flight too?", agent: "No, extra baggage is per flight segment — you'd need to add it separately for the return leg." },
        { user: "Ah ok, please add the same 20kg to the return too.", agent: "Done — both segments now have the 20kg extra allowance." },
      ],
    },
    {
      key: "EXT1-CV-07", channel: "web", username: "Do Minh Tuan", email: "do.minh.tuan@gmail.com", endedAt: t[6],
      turns: [
        { user: "My flight VN6610 to Hue was just cancelled, what happens now?", agent: "I'm sorry about that — VN6610 was cancelled due to weather. I can rebook you on the next available flight." },
        { user: "When's the next one?", agent: "There's a flight at 15:40 today, or 08:00 tomorrow if you'd prefer to wait." },
        { user: "I need to get there today if at all possible.", agent: "The 15:40 flight has 4 seats left — shall I move you to that one at no extra charge?" },
        { user: "Yes, please do that.", agent: "Done — you're now confirmed on the 15:40 flight, same seat class. Updated e-ticket sent." },
        { user: "Is there any compensation for the cancellation?", agent: "Yes, weather cancellations qualify for a meal voucher and priority rebooking, which you've already received." },
        { user: "What about the connecting flight I had booked from Hue?", agent: "Let me check — your connecting flight VN6620 was scheduled for 18:00, which should still be reachable from the new arrival time." },
        { user: "Are you sure? My original arrival was earlier.", agent: "The 15:40 flight now arrives at 17:15, giving you 45 minutes to connect — it should be enough, but I'll flag it as tight." },
        { user: "Can you ask the gate to hold if I'm running late?", agent: "I've added a note to your booking requesting priority assistance for the connection given the short window." },
        { user: "Thank you. Also, will I still get my checked bag through to the final destination?", agent: "Yes, your baggage is already tagged through to your final destination on VN6620." },
        { user: "One more concern — will I lose my seat selection on the connecting flight?", agent: "No, your seat 14C on VN6620 is unaffected by this change." },
        { user: "Ok, I think that covers everything.", agent: "Just to confirm: VN6610 rebooked to 15:40 today, connecting to VN6620 at 18:00, baggage through-checked, seat retained." },
        { user: "That's correct, thank you for sorting this out quickly.", agent: "Of course — I'm sorry for the disruption. Let me know if the connection becomes an issue and I can look at alternatives." },
        { user: "Will do, appreciate the help.", agent: "Safe travels, and I hope the rest of your trip goes smoothly." },
      ],
    },
    {
      key: "EXT1-CV-08", channel: "zalo", username: "Bui Thi Ngoc", email: "bui.thi.ngoc@gmail.com", endedAt: t[7],
      turns: [
        { user: "Can I choose my seat for booking VN8812?", agent: "Sure — economy seat maps are available. Window, aisle, or middle preference?" },
        { user: "Window please, near the front if possible.", agent: "Seat 3A is available — window, near the front. Shall I assign it?" },
        { user: "Yes please. Also, how much to upgrade to premium economy?", agent: "Premium economy upgrade for this flight is 850,000 VND, with extra legroom and priority boarding." },
        { user: "Let's do the upgrade instead of the economy seat.", agent: "Upgraded to premium economy, seat 3A reassigned in that cabin. Confirmation sent." },
        { user: "Perfect, thank you.", agent: "You're welcome — enjoy the extra legroom!" },
        { user: "Also, does this flight have wifi?", agent: "Yes, this aircraft has onboard wifi available for purchase after takeoff." },
      ],
    },
    {
      key: "EXT1-CV-09", channel: "api", username: "Ngo Van Phuc", email: "ngo.van.phuc@gmail.com", endedAt: t[8],
      turns: [
        { user: "Can I bring a 25kg checked bag on economy?", agent: "Economy includes 23kg checked — 25kg would incur an excess baggage fee of about 150,000 VND." },
        { user: "Ok, I'll pack lighter then.", agent: "Good call — let me know if you'd like help with anything else." },
      ],
    },
    {
      key: "EXT1-CV-10", channel: "web", username: "Dang Thi Hoa", email: "dang.thi.hoa@gmail.com", endedAt: t[9],
      turns: [
        { user: "I'd like to request a refund for booking VN4410, I can't travel anymore.", agent: "I'm sorry to hear that. VN4410 is a standard economy fare, which is non-refundable, but eligible for a travel credit." },
        { user: "How much credit would I get?", agent: "The full fare of 1,450,000 VND minus a 200,000 VND processing fee, so 1,250,000 VND in credit." },
        { user: "That works. How long is the credit valid?", agent: "12 months from today, usable on any future booking." },
        { user: "Please go ahead and process it.", agent: "Processed — your travel credit of 1,250,000 VND is now available in your account." },
        { user: "Thanks for the help.", agent: "Of course — let me know if you'd like to use it for a new booking." },
        { user: "Actually, can I use part of it right now for a flight to Quy Nhon?", agent: "Yes — there's a flight on the 22nd for 890,000 VND, which the credit fully covers with 360,000 VND left over." },
        { user: "Book it with the credit please.", agent: "Booked using your travel credit — confirmation code VN4499, remaining credit balance is 360,000 VND." },
      ],
    },
    {
      key: "EXT1-CV-11", channel: "zalo", username: "Nguyen Van An", email: "nguyen.van.an@gmail.com", endedAt: t[10],
      turns: [
        { user: "I need to book flights for my family, 4 people, to Nha Trang.", agent: "Happy to help — what dates are you looking at, and are all 4 traveling together on the same flights?" },
        { user: "Yes, same flights both ways. Departing the 20th, returning the 27th.", agent: "There's a flight on the 20th at 10:00 with 4 seats available, and a return on the 27th at 19:00, also 4 seats. Total for all 4 round trip is 6,200,000 VND." },
        { user: "That works, please book all 4.", agent: "Booked — confirmation codes VN7701 through VN7704, one per passenger. I'll need each passenger's full name for the tickets." },
        { user: "Nguyen Van An, Nguyen Thi Lan, Nguyen Van Binh, and Nguyen Thi Mai.", agent: "Names added to all 4 bookings. Two are labeled as children — should I apply child fares where applicable?" },
        { user: "Yes, Binh and Mai are both under 12.", agent: "Adjusted — child fares applied, reducing the total by 480,000 VND. Updated total is 5,720,000 VND." },
        { user: "Can we all sit together?", agent: "I've assigned seats 22A through 22D on the outbound, and 15A through 15D on the return, so you're all together on both flights." },
        { user: "Perfect. Actually, can we change the return date to the 28th instead?", agent: "The 28th has availability at 19:00 as well, same fare — shall I move all 4 bookings?" },
        { user: "Yes, please move all of them.", agent: "All 4 return flights moved to the 28th, no change fee since it's the same route and fare class." },
        { user: "Do the children need anything special for check-in?", agent: "Just a copy of their birth certificate or ID at check-in to confirm the child fare." },
        { user: "Got it. What about meals on board?", agent: "Standard meals are included for this route — I can note dietary preferences if needed." },
        { user: "One of the kids has a nut allergy, please note that.", agent: "Noted — a nut-free meal request has been added for Nguyen Thi Mai on both flights." },
        { user: "Thank you. Can you send the full itinerary to my email?", agent: "Sent — all 4 passengers, both flights, seat assignments, and the meal note are included." },
        { user: "This is great, thanks for handling all the details.", agent: "You're welcome — have a wonderful trip to Nha Trang!" },
        { user: "One last thing — is travel insurance available for the group?", agent: "Yes, group travel insurance is 85,000 VND per person — would you like me to add it for all 4?" },
        { user: "Yes, add it for everyone.", agent: "Added — all 4 passengers now have travel insurance included in the booking." },
      ],
    },
    {
      key: "EXT1-CV-12", channel: "api", username: "Tran Thi Bich", email: "tran.thi.bich@gmail.com", endedAt: t[11],
      turns: [
        { user: "How many loyalty points do I have?", agent: "You currently have 18,400 points." },
        { user: "What can I redeem that for?", agent: "That's enough for a one-way domestic economy ticket, or a partial upgrade voucher." },
        { user: "I'd like to redeem for a ticket to Da Lat next month.", agent: "There's a flight to Da Lat on the 8th — redeeming 18,000 points covers it fully, with 400 points remaining." },
        { user: "Which date exactly, and what time?", agent: "March 8th, departing 10:30, arriving 11:45." },
        { user: "That works, please book it with points.", agent: "Booked using 18,000 points — confirmation code VN9021, e-ticket sent." },
        { user: "Thank you so much.", agent: "You're welcome — enjoy your trip to Da Lat!" },
        { user: "Actually, can I also add a checked bag to that booking?", agent: "Yes, 23kg is already included with this fare — no need to add anything." },
        { user: "Perfect, one less thing to worry about.", agent: "Exactly — you're all set for the trip." },
      ],
    },
    {
      key: "EXT1-CV-13", channel: "web", username: "Le Quoc Bao", email: "le.quoc.bao@gmail.com", endedAt: t[12],
      turns: [
        { user: "What's your cancellation policy for economy fares?", agent: "Economy fares are non-refundable but can be changed once for a 300,000 VND fee plus any fare difference." },
        { user: "And business class?", agent: "Business fares are fully refundable up to 24 hours before departure." },
        { user: "Got it, thank you.", agent: "Anytime!" },
      ],
    },
    {
      key: "EXT1-CV-14", channel: "zalo", username: "Pham Thi Lan", email: "pham.thi.lan@gmail.com", endedAt: t[13],
      turns: [
        { user: "There's a charge on my card I don't recognize from your airline, 890,000 VND.", agent: "I'm sorry to hear that — let me look into it. Can you confirm the approximate date of the charge?" },
        { user: "It was about a week ago, the 15th.", agent: "I see a booking made on the 15th for a flight to Can Tho under a different passenger name — Tran Van Hai. Does that match anyone on your account?" },
        { user: "No, I don't know that name. This must be a mistake or fraud.", agent: "Understood, I'm opening a dispute case — reference #DP-6621 — and temporarily reversing the charge while we investigate." },
        { user: "How long will the investigation take?", agent: "Typically 5 to 10 business days. I'll update you by email once it's resolved." },
        { user: "Should I cancel my card?", agent: "That would be a good precaution — I'd recommend contacting your bank directly as well, since this may involve their side too." },
        { user: "Ok, I'll do that. Will the booking under my name be cancelled?", agent: "Yes, since the charge is disputed, I've flagged that booking for cancellation pending the investigation outcome." },
        { user: "Thank you. Will I be notified either way?", agent: "Yes, you'll get an email whether the dispute is upheld or if we need more information from you." },
        { user: "Is there anything else I need to do right now?", agent: "Just keep an eye on your email and your bank statement — otherwise this is being handled on our end." },
        { user: "Alright. Can I get a reference number for my own records?", agent: "Yes, it's #DP-6621, the same one I mentioned earlier." },
        { user: "Got it, thank you for taking this seriously.", agent: "Of course — I'm sorry this happened, and we'll make sure it's resolved properly." },
        { user: "Following up — has case DP-6621 been resolved yet?", agent: "Yes, the investigation confirmed the charge was fraudulent. Your 890,000 VND has been permanently refunded." },
        { user: "That's a relief, thank you for following through.", agent: "You're very welcome — let us know if you notice anything else unusual." },
      ],
    },
  ];
}

/** HR Helpdesk (ext-seed-2) — published to Slack, plus API. 4 short (2-6 msgs), 6 medium
 * (8-16 msgs), 4 long (24-40 msgs). */
function hrHelpdeskSpecs(now: number): SeedSpec[] {
  const t = agentTimestamps(now);
  return [
    {
      key: "EXT2-CV-01", channel: "slack", username: "Pham Thi Hoa", email: "pham.thi.hoa@abc.ai", endedAt: t[0],
      turns: [
        { user: "How many sick leave days do I have left this year?", agent: "You have 4 sick leave days remaining out of the annual 12." },
      ],
    },
    {
      key: "EXT2-CV-02", channel: "api", username: "Vu Dinh Khoi", endedAt: t[1],
      turns: [
        { user: "I'm expecting a child, what's the maternity leave policy?", agent: "Congratulations! Maternity leave is 6 months paid, per Vietnamese labor law, plus an optional 1 month unpaid if needed." },
        { user: "When should I submit my request?", agent: "Ideally at least 30 days before your expected leave start date, along with a medical certificate." },
        { user: "I'm due in about 2 months, is that enough notice?", agent: "Yes, that's plenty of time — I can send you the leave request form now if you'd like." },
        { user: "Yes please, send it over.", agent: "Sent to your email — let me know if you have questions filling it out." },
      ],
    },
    {
      key: "EXT2-CV-03", channel: "slack", username: "Le Van Thanh", email: "le.van.thanh@abc.ai", endedAt: t[2],
      turns: [
        { user: "It's open enrollment, I want to review my benefits options.", agent: "Sure — you're currently on the Standard health plan and the default life insurance coverage. Would you like to see the other tiers?" },
        { user: "Yes, what's different about the Premium plan?", agent: "Premium adds dental major procedures, vision coverage, and a lower deductible — it costs an extra 220,000 VND per month." },
        { user: "Does it cover my spouse and kids too?", agent: "Dependent coverage is separate — adding a spouse is 180,000 VND/month, and each child is 90,000 VND/month, on top of the plan tier." },
        { user: "I have a spouse and one child, what would the total be on Premium?", agent: "Premium (you) 220,000 + spouse 180,000 + one child 90,000 = 490,000 VND/month total." },
        { user: "That's more than I expected. What if I stay on Standard but add dependents?", agent: "Standard with the same dependents would be spouse 150,000 + child 75,000 = 225,000 VND/month, since dependent rates are lower on Standard." },
        { user: "Let's go with Standard plus both dependents then.", agent: "Got it — I'll set that up. I'll need your spouse's and child's ID numbers and dates of birth." },
        { user: "I'll need to get those, can I submit them later?", agent: "Yes, you have until the enrollment deadline on the 30th to submit dependent details." },
        { user: "What happens to my life insurance in this change?", agent: "Life insurance is unaffected — it stays at your current coverage of 2x annual salary regardless of health plan tier." },
        { user: "Can I increase that coverage separately?", agent: "Yes, you can elect up to 4x annual salary for an additional cost — would you like a quote?" },
        { user: "Yes, what would 3x cost?", agent: "3x annual salary would add approximately 45,000 VND/month to your deductions." },
        { user: "Let's add that as well.", agent: "Added — life insurance increased to 3x salary, plus the Standard health plan with your two dependents pending their details." },
        { user: "Can you send me a summary of everything before I confirm?", agent: "Sent to your email — Standard plan, spouse and child dependents pending ID info, and 3x life insurance coverage." },
        { user: "This all looks right, I'll submit the dependent info by the deadline.", agent: "Sounds good — your enrollment will finalize automatically once that's received, or I can follow up if the deadline is close." },
      ],
    },
    {
      key: "EXT2-CV-04", channel: "api", username: "Nguyen Thi Trang", email: "nguyen.thi.trang@abc.ai", endedAt: t[3],
      turns: [
        { user: "I have some travel expenses from a client visit last week, how do I get reimbursed?", agent: "Submit your receipts through the Expenses tab with a short description of the business purpose." },
        { user: "Is there a deadline?", agent: "Within 30 days of the expense date, so you're within the window." },
        { user: "I have a taxi receipt without a printed total, is that ok?", agent: "That should be fine as long as the amount is handwritten and legible, or you can attach the app payment confirmation instead." },
        { user: "I'll attach both to be safe.", agent: "Good idea — that will speed up approval." },
        { user: "How long does approval usually take?", agent: "Typically 3 to 5 business days once submitted." },
      ],
    },
    {
      key: "EXT2-CV-05", channel: "slack", username: "Tran Van Hung", email: "tran.van.hung@abc.ai", endedAt: t[4],
      turns: [
        { user: "What's the notice period for resignation?", agent: "Standard notice period is 30 days for full-time staff, or 45 days for managerial roles." },
        { user: "I'm full-time, so 30 days then.", agent: "That's correct — 30 days from your resignation letter date." },
      ],
    },
    {
      key: "EXT2-CV-06", channel: "api", username: "Dinh Thi Thu", email: "dinh.thi.thu@abc.ai", endedAt: t[5],
      turns: [
        { user: "I'm starting next Monday, what do I need to bring?", agent: "Please bring a government ID, your signed offer letter, and a bank account number for payroll setup." },
        { user: "Do I need to bring my own laptop?", agent: "No, IT will issue you a company laptop on your first day." },
        { user: "What time should I arrive?", agent: "9:00 AM at the main office reception, someone from HR will meet you there." },
        { user: "Great, see you then.", agent: "Looking forward to it — welcome to the team!" },
      ],
    },
    {
      key: "EXT2-CV-07", channel: "slack", username: "Hoang Van Nam", email: "hoang.van.nam@abc.ai", endedAt: t[6],
      turns: [
        { user: "I need to raise a concern about how a project deadline was handled by my manager.", agent: "I'm sorry to hear that. Can you tell me a bit more about what happened?" },
        { user: "The deadline was moved up without notice and I was blamed for missing it.", agent: "That sounds stressful. Would you like this logged as a formal complaint, or would you prefer an informal conversation first?" },
        { user: "I think I'd like it documented, in case this keeps happening.", agent: "Understood — I'll open a formal case. Can you give me the approximate date this occurred?" },
        { user: "About two weeks ago, the 10th.", agent: "Noted. Were there any messages or emails about the deadline change I should reference?" },
        { user: "Yes, there's a Slack message where it was moved up.", agent: "Please forward that to me or attach it to the case — it'll help HR review the timeline accurately." },
        { user: "I'll send it over now.", agent: "Thank you — case #HR-2291 is now open. Someone from HR will reach out within 3 business days." },
        { user: "Will my manager know I filed this?", agent: "Not initially — HR reviews the case first and decides how to proceed, which may or may not involve a direct conversation." },
        { user: "I'm a bit worried about retaliation.", agent: "That's a valid concern — retaliation for raising a good-faith complaint is against policy and can be reported separately if it happens." },
        { user: "Ok, that's reassuring. What's the typical timeline for these cases?", agent: "Most cases are reviewed within 10 business days, though it can take longer if more information is needed." },
        { user: "Will I get updates during that time?", agent: "Yes, HR will check in at least once during the review, even if there's no resolution yet." },
        { user: "Thank you. Is there anything else I should do on my end?", agent: "Just continue to document any similar incidents going forward, with dates and details." },
        { user: "I will. Following up a few days later — any update on HR-2291?", agent: "The case is currently under review by an HR specialist — I don't have a resolution yet, but it's actively being looked at." },
        { user: "Ok, I'll wait to hear back.", agent: "I'll make sure it's flagged as a priority given the time that's passed." },
        { user: "Checking in again — has there been any progress on HR-2291?", agent: "Yes, actually — HR completed their review. A conversation has been scheduled between you, your manager, and an HR representative for this Friday." },
        { user: "That's good to hear, thank you for staying on top of it.", agent: "Of course — let me know how the meeting goes, and reach out if you need anything before then." },
      ],
    },
    {
      key: "EXT2-CV-08", channel: "api", username: "Cao Thi Yen", email: "cao.thi.yen@abc.ai", endedAt: t[7],
      turns: [
        { user: "When are performance reviews this cycle?", agent: "Mid-year reviews are scheduled for the first two weeks of next month." },
        { user: "Do I need to prepare anything?", agent: "Yes, a self-assessment form is due 3 days before your scheduled review date." },
        { user: "Where do I find that form?", agent: "It's under the Performance tab in the HR portal." },
        { user: "I don't see my review date listed yet.", agent: "Let me check — it looks like your manager hasn't scheduled it yet, I'll send them a reminder." },
        { user: "Thanks, please let me know once it's set.", agent: "Will do — you'll get an email as soon as it's confirmed." },
        { user: "Appreciate it, this is my first review here.", agent: "No problem — feel free to reach out if you have any questions preparing your self-assessment." },
      ],
    },
    {
      key: "EXT2-CV-09", channel: "slack", username: "Phan Van Loc", email: "phan.van.loc@abc.ai", endedAt: t[8],
      turns: [
        { user: "When is this month's salary paid?", agent: "Salary is paid on the 28th of each month, or the prior business day if it falls on a weekend." },
        { user: "Thanks, just wanted to confirm.", agent: "No problem, let me know if anything else comes up." },
      ],
    },
    {
      key: "EXT2-CV-10", channel: "api", username: "Ly Thi Kim", email: "ly.thi.kim@abc.ai", endedAt: t[9],
      turns: [
        { user: "I need to file a health insurance claim for a hospital visit.", agent: "Sure — do you have the hospital invoice and medical report ready to upload?" },
        { user: "I have the invoice, but not the medical report yet.", agent: "You can submit the invoice now and add the report once you receive it, within 60 days." },
        { user: "How much of the cost is typically covered?", agent: "Inpatient care is covered at 80%, outpatient at 70%, depending on your plan." },
        { user: "This was an outpatient visit, so 70% then.", agent: "That's right — based on the invoice amount, your estimated reimbursement is around 1,800,000 VND." },
        { user: "When would I receive that?", agent: "Once the claim is fully processed with both documents, payment usually takes 10 business days." },
        { user: "Understood, I'll upload the report as soon as I get it.", agent: "Sounds good — the claim will stay pending until then." },
        { user: "One more thing, does this claim count against my annual limit?", agent: "Yes, it will count toward your annual outpatient limit of 15,000,000 VND, which you're well within." },
      ],
    },
    {
      key: "EXT2-CV-11", channel: "slack", username: "Pham Thi Hoa", email: "pham.thi.hoa@abc.ai", endedAt: t[10],
      turns: [
        { user: "I'm interested in transferring to a different team, how does that process work?", agent: "Internal transfers start with an expression of interest form, plus a conversation with your current manager." },
        { user: "Do I need my manager's approval first?", agent: "Not strictly required to start the process, but it's recommended so there's a smooth handover if it goes through." },
        { user: "Which team are you interested in moving to?", agent: "I should be asking you that — which team did you have in mind?" },
        { user: "Sorry, I meant to ask that myself — I'm interested in the Product team.", agent: "Got it — there's currently one open Product Analyst role. Would you like me to share the internal job posting?" },
        { user: "Yes please.", agent: "Sent to your email, along with the internal application form." },
        { user: "Do I need to interview even though I'm internal?", agent: "Yes, typically a shorter internal interview process — usually one conversation with the hiring manager." },
        { user: "What happens to my current role if I get it?", agent: "HR coordinates a transition timeline with both managers, usually 2-4 weeks depending on backfill needs." },
        { user: "Will my salary change?", agent: "It depends on the new role's band — Product Analyst has a similar band to your current role, so likely minimal change if any." },
        { user: "What about my tenure and benefits?", agent: "Both carry over fully — an internal transfer doesn't reset your start date or benefits eligibility." },
        { user: "That's good to know. How long is the whole process usually?", agent: "From application to start date, typically 4 to 6 weeks total." },
        { user: "I'll go ahead and apply then.", agent: "Great — let me know once you've submitted the form and I can help track the process." },
        { user: "Just submitted it.", agent: "Received — I've logged your application, and the hiring manager will reach out to schedule the interview." },
        { user: "Should I tell my current manager now or wait?", agent: "It's usually best to let your manager know once you're past the initial screening, to avoid unnecessary uncertainty." },
        { user: "That makes sense, I'll wait then. Thanks for walking me through this.", agent: "Happy to help — best of luck with the Product Analyst role!" },
      ],
    },
    {
      key: "EXT2-CV-12", channel: "api", username: "Vu Dinh Khoi", endedAt: t[11],
      turns: [
        { user: "I worked extra hours last week, how is overtime calculated?", agent: "Weekday overtime is paid at 150% of your hourly rate, weekend at 200%, and holidays at 300%." },
        { user: "I worked 6 extra hours on a Saturday.", agent: "At 200% weekend rate, that comes to approximately 960,000 VND based on your current salary." },
        { user: "Is that automatically added to my next paycheck?", agent: "Yes, once your manager approves the logged overtime hours in the system." },
        { user: "I don't think my manager has approved it yet.", agent: "Let me check — it's still pending approval, I'll send a reminder on your behalf." },
        { user: "Thank you, I want to make sure it's in this month's payroll.", agent: "Understood — payroll cutoff is the 25th, so there's still time if it's approved by then." },
        { user: "I'll follow up with my manager directly too.", agent: "Good idea — let me know if it's still not approved by the 23rd and I'll escalate." },
        { user: "Will follow up, thanks for checking.", agent: "Anytime — happy to escalate if needed." },
        { user: "Following up — it's been approved now.", agent: "Confirmed, I can see it's approved and will be included in this month's payroll run." },
      ],
    },
    {
      key: "EXT2-CV-13", channel: "slack", username: "Le Van Thanh", email: "le.van.thanh@abc.ai", endedAt: t[12],
      turns: [
        { user: "Does our health insurance cover dental?", agent: "Basic dental cleaning and checkups are covered; major procedures like root canals need the premium plan." },
        { user: "How do I check which plan I'm on?", agent: "You're currently on the Standard plan, which includes basic dental." },
        { user: "Got it, thanks.", agent: "You're welcome!" },
      ],
    },
    {
      key: "EXT2-CV-14", channel: "api", username: "Nguyen Thi Trang", email: "nguyen.thi.trang@abc.ai", endedAt: t[13],
      turns: [
        { user: "I need a salary certificate for a bank loan application.", agent: "Sure — I can generate that. Do you need it in Vietnamese, English, or both?" },
        { user: "Both please, the bank asked for an English version too.", agent: "Got it — I'll prepare a bilingual certificate. It usually takes 2 business days." },
        { user: "The bank needs it by Friday, is that possible?", agent: "That should work — today is Monday, so 2 business days puts it at Wednesday." },
        { user: "Great, thank you. Does it need my manager's signature?", agent: "No, HR signs and stamps salary certificates directly, no manager signature needed." },
        { user: "Perfect. Also, while I have you — can you tell me my current base salary on record?", agent: "Your recorded base salary is 28,500,000 VND per month, before deductions." },
        { user: "That doesn't include my recent raise, I think.", agent: "Let me check — I see a raise approved last month, but it looks like it hasn't been reflected in the system yet." },
        { user: "That's concerning, especially for this certificate.", agent: "I understand — let me escalate this to payroll so the certificate reflects your updated salary." },
        { user: "How long will that take?", agent: "I'll mark it urgent given your deadline — hopefully resolved by tomorrow." },
        { user: "I appreciate you prioritizing it.", agent: "Of course — I'll follow up with you as soon as payroll confirms the correction." },
        { user: "Any update on the salary correction?", agent: "Yes, payroll confirmed the raise is now reflected — your updated base salary is 31,000,000 VND per month." },
        { user: "That's a relief. Can the certificate now be issued with the correct amount?", agent: "Yes, I'm generating it now with the updated figure — you'll have it by end of day." },
        { user: "Thank you so much for sorting this out quickly.", agent: "You're very welcome — glad we caught that before it caused an issue with your loan application." },
      ],
    },
  ];
}

/** Only published (or previously-published) agents get seeded conversations — an agent that's
 * never gone live has never had a real user turn, so it gets the genuine empty state instead. */
const SEEDED_AGENT_IDS = new Set(["ext-seed-1", "ext-seed-2"]);

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  if (!SEEDED_AGENT_IDS.has(agentId)) return;
  const now = Date.now();
  const specs = agentId === "ext-seed-1" ? flightAssistantSpecs(now) : hrHelpdeskSpecs(now);
  for (const s of specs) {
    const c = toConversation(agentId, s);
    store.set(k(agentId, c.id), c);
  }
}

export const externalAgentConversationStore = {
  list(agentId: string): ExternalConversation[] {
    seedAgent(agentId);
    return [...store.values()]
      .filter(c => c.agentId === agentId)
      .sort((a, b) => b.endedAt - a.endedAt);
  },
  get(agentId: string, threadId: string): ExternalConversation | undefined {
    seedAgent(agentId);
    return store.get(k(agentId, threadId));
  },
};
