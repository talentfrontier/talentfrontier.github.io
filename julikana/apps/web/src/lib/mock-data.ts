/** Demo data shown when no backend is connected (preview mode). */

export const mockSummary = {
  revenueCents: 1_284_500,
  leads: 214,
  leadsDelta: 18,
  conversations: 389,
  scheduledPosts: 12,
  aiTasksRunning: 3,
  aiTasksCompleted: 47,
  followers: [
    { platform: "FACEBOOK", followerCount: 12_400, connected: true },
    { platform: "INSTAGRAM", followerCount: 9_850, connected: true },
    { platform: "TIKTOK", followerCount: 21_300, connected: true },
    { platform: "LINKEDIN", followerCount: 3_150, connected: false },
  ],
  reach: 148_000,
  clicks: 6_240,
  engagementRate: 4.7,
};

export const mockSeries = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10);
  const wave = Math.sin(i / 4.5) * 0.3 + 1;
  return {
    date,
    reach: Math.round((3_000 + i * 120) * wave),
    engagements: Math.round((240 + i * 14) * wave),
    leads: Math.max(1, Math.round((4 + i * 0.25) * wave)),
    followers: 45_000 + i * 60,
  };
});

export const mockFunnel = [
  { stage: "NEW_LEAD", count: 86 },
  { stage: "CONTACTED", count: 54 },
  { stage: "INTERESTED", count: 38 },
  { stage: "QUALIFIED", count: 24 },
  { stage: "APPOINTMENT", count: 15 },
  { stage: "PROPOSAL_SENT", count: 10 },
  { stage: "NEGOTIATION", count: 6 },
  { stage: "WON", count: 4 },
];

export const mockLeads = [
  { id: "1", name: "Amina Yusuf", email: "amina@example.com", phone: "+254 700 111222", source: "whatsapp", score: 86, stage: "QUALIFIED", createdAt: new Date(Date.now() - 3600e3).toISOString() },
  { id: "2", name: "John Mwangi", email: "john.m@example.com", phone: "+254 711 333444", source: "facebook_comment", score: 72, stage: "INTERESTED", createdAt: new Date(Date.now() - 7200e3).toISOString() },
  { id: "3", name: "Grace Njeri", email: "grace@example.com", phone: null, source: "instagram_dm", score: 64, stage: "CONTACTED", createdAt: new Date(Date.now() - 86400e3).toISOString() },
  { id: "4", name: "Peter Otieno", email: null, phone: "+254 722 555666", source: "landing_page", score: 45, stage: "NEW_LEAD", createdAt: new Date(Date.now() - 2 * 86400e3).toISOString() },
  { id: "5", name: "Mary Wanjiru", email: "mary.w@example.com", phone: "+254 733 777888", source: "tiktok", score: 91, stage: "APPOINTMENT", createdAt: new Date(Date.now() - 3 * 86400e3).toISOString() },
];

export const mockConversations = [
  { id: "c1", channel: "whatsapp", status: "AI_HANDLING", lead: { name: "Amina Yusuf" }, lastMessage: "Perfect — Domo booked your viewing for Saturday 10am.", updatedAt: new Date(Date.now() - 900e3).toISOString() },
  { id: "c2", channel: "messenger", status: "NEEDS_HUMAN", lead: { name: "John Mwangi" }, lastMessage: "I'd like to speak to a manager about bulk pricing.", updatedAt: new Date(Date.now() - 3600e3).toISOString() },
  { id: "c3", channel: "instagram_dm", status: "AI_HANDLING", lead: { name: "Grace Njeri" }, lastMessage: "Yes! We have the 3-bedroom available from August.", updatedAt: new Date(Date.now() - 5400e3).toISOString() },
];

export const mockTasks = [
  { id: "t1", agent: "CONTENT_CREATOR", title: "Create social content for laptop promo", status: "RUNNING", progress: 60, createdAt: new Date(Date.now() - 300e3).toISOString() },
  { id: "t2", agent: "VIDEO_CREATOR", title: "15s reel: new arrivals showcase", status: "RUNNING", progress: 35, createdAt: new Date(Date.now() - 600e3).toISOString() },
  { id: "t3", agent: "LEAD_QUALIFIER", title: "Re-score 214 active leads", status: "COMPLETED", progress: 100, createdAt: new Date(Date.now() - 5400e3).toISOString() },
  { id: "t4", agent: "SOCIAL_MEDIA_MANAGER", title: "Schedule week 29 content calendar", status: "COMPLETED", progress: 100, createdAt: new Date(Date.now() - 9000e3).toISOString() },
];

export const mockSuggestions = [
  { id: "s1", kind: "posting_time", title: "Post reels at 7pm, not 2pm", body: "Your last 12 reels earned 3.1× more engagement after 6pm. Domo can reschedule this week's queue.", createdAt: new Date().toISOString() },
  { id: "s2", kind: "trend", title: "\"Day in the life\" format trending in your niche", body: "Short behind-the-scenes clips are outperforming polished ads 2:1 this month. Idea: a 20s walkthrough of a new listing.", createdAt: new Date().toISOString() },
  { id: "s3", kind: "hashtags", title: "Swap #realestate for locality tags", body: "#NairobiHomes and #KilimaniLiving drive 4× more profile visits than generic tags on your posts.", createdAt: new Date().toISOString() },
];

export const mockContent = [
  { id: "ci1", type: "REEL", status: "GENERATING", title: "New arrivals — cinematic walkthrough", createdAt: new Date().toISOString() },
  { id: "ci2", type: "POST", status: "READY", title: "5 reasons Kilimani is the neighbourhood to watch", createdAt: new Date().toISOString() },
  { id: "ci3", type: "CAROUSEL", status: "APPROVED", title: "Before/after: staging that sells", createdAt: new Date().toISOString() },
  { id: "ci4", type: "EMAIL_CAMPAIGN", status: "PUBLISHED", title: "July open-house invitations", createdAt: new Date().toISOString() },
];

export const mockCampaigns = [
  { id: "cp1", name: "July Open Houses", objective: "leads", status: "ACTIVE", budgetCents: 50_000_00, spentCents: 31_200_00, platforms: ["FACEBOOK", "INSTAGRAM"], _count: { contentItems: 8 } },
  { id: "cp2", name: "First-time Buyer Guide", objective: "awareness", status: "ACTIVE", budgetCents: 20_000_00, spentCents: 4_800_00, platforms: ["TIKTOK", "YOUTUBE"], _count: { contentItems: 5 } },
  { id: "cp3", name: "Q2 Listings Push", objective: "sales", status: "COMPLETED", budgetCents: 80_000_00, spentCents: 79_100_00, platforms: ["FACEBOOK", "INSTAGRAM", "X"], _count: { contentItems: 21 } },
];

export const mockWorkflows = [
  { id: "w1", name: "\"Price\" comment → DM + CRM + follow-up", enabled: true, _count: { runs: 132 } },
  { id: "w2", name: "New WhatsApp lead → notify sales team", enabled: true, _count: { runs: 89 } },
  { id: "w3", name: "Stale qualified lead → re-engage after 3 days", enabled: false, _count: { runs: 41 } },
];
