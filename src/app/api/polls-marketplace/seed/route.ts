import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/polls-marketplace/seed — Seed dummy listings for demo
// Call once to populate the marketplace with showcase data
export async function POST() {
  try {
    // Check if we already have seeded data
    const existingCount = await db.paidPollListing.count();
    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Marketplace already has ${existingCount} listings. No new seed data added.`,
        total: existingCount,
      });
    }

    // ─── Create dummy company/creator users ───────────────────────────
    const companyUsers = [
      { username: 'nielsenresearch', displayName: 'Nielsen Research Group', role: 'creator' },
      { username: 'coca_cola_insights', displayName: 'Coca-Cola Consumer Insights', role: 'creator' },
      { username: 'techpulse_survey', displayName: 'TechPulse Survey Co.', role: 'creator' },
      { username: 'globalhealth_polls', displayName: 'Global Health Polls', role: 'creator' },
      { username: 'autoindustry_forums', displayName: 'Auto Industry Forums', role: 'creator' },
      { username: 'streamwatch_data', displayName: 'StreamWatch Data', role: 'creator' },
      { username: 'fashiontrend_lab', displayName: 'FashionTrend Lab', role: 'creator' },
      { username: 'edufirst_research', displayName: 'EduFirst Research', role: 'creator' },
      { username: 'foodiemetrics', displayName: 'FoodieMetrics Inc.', role: 'creator' },
      { username: 'greenearth_surveys', displayName: 'GreenEarth Surveys', role: 'creator' },
      { username: 'finmarkets_poll', displayName: 'Financial Markets Poll', role: 'creator' },
      { username: 'sportsworld_insights', displayName: 'SportsWorld Insights', role: 'creator' },
    ];

    const createdUsers: { id: string; username: string }[] = [];
    for (const u of companyUsers) {
      const existing = await db.user.findUnique({ where: { username: u.username } });
      if (existing) {
        createdUsers.push({ id: existing.id, username: existing.username });
      } else {
        const user = await db.user.create({
          data: {
            username: u.username,
            email: `${u.username}@seed.fmf`,
            passwordHash: '$2b$10$seed_hash_not_real_password',
            displayName: u.displayName,
            role: u.role,
            memberScore: 950,
            isVerified: true,
            onboardingCompleted: true,
          },
        });
        createdUsers.push({ id: user.id, username: user.username });
      }
    }

    // ─── Create diverse dummy listings ────────────────────────────────
    const now = Date.now();
    const day = 86400000;
    const hour = 3600000;

    const listings = [
      {
        creatorId: createdUsers[0].id,
        title: 'Consumer Brand Preferences — Q2 2026',
        description: 'We need 200 verified consumers to share their brand preferences across FMCG categories. This quarterly survey helps major brands understand shifting consumer behavior. Your responses directly influence product development decisions at Fortune 500 companies.',
        minScore: 300,
        verifiedOnly: true,
        minPollResponses: 5,
        location: null,
        ageRange: '18-55',
        gender: null,
        interests: '["consumer goods","branding","marketing"]',
        rewardPerResponse: 12.50,
        totalBudget: 2500,
        slots: 200,
        filledSlots: 143,
        status: 'active',
        createdAt: new Date(now - 10 * day),
        closesAt: new Date(now + 5 * day),
      },
      {
        creatorId: createdUsers[1].id,
        title: 'Beverage Taste Test Feedback — New Flavors',
        description: 'Participate in our exclusive beverage taste test survey. We are launching 3 new flavors and need authentic consumer feedback. Share your honest opinions on taste, packaging appeal, and purchase intent. Participants who complete the full survey receive bonus payment.',
        minScore: 200,
        verifiedOnly: true,
        minPollResponses: 3,
        location: 'United States',
        ageRange: '18-40',
        gender: null,
        interests: '["food","beverages","taste testing"]',
        rewardPerResponse: 8.75,
        totalBudget: 1312.50,
        slots: 150,
        filledSlots: 89,
        status: 'active',
        createdAt: new Date(now - 3 * day),
        closesAt: new Date(now + 10 * day),
      },
      {
        creatorId: createdUsers[2].id,
        title: 'AI Adoption in the Workplace — Tech Professionals',
        description: 'Help us understand how AI tools are being adopted across different industries. We are surveying technology professionals about their daily use of AI, concerns about automation, and expectations for the future. Your insights will be featured in our annual Tech Adoption Report.',
        minScore: 500,
        verifiedOnly: true,
        minPollResponses: 10,
        location: null,
        ageRange: '25-55',
        gender: null,
        interests: '["technology","AI","software","automation"]',
        rewardPerResponse: 25.00,
        totalBudget: 3750,
        slots: 150,
        filledSlots: 62,
        status: 'active',
        createdAt: new Date(now - 1 * day),
        closesAt: new Date(now + 14 * day),
      },
      {
        creatorId: createdUsers[3].id,
        title: 'Global Health Awareness — Mental Wellbeing',
        description: 'A major health organization wants to gauge public awareness of mental health resources and stigma. This anonymous poll asks about personal experiences, awareness of support services, and opinions on workplace mental health policies. All responses are completely confidential.',
        minScore: 100,
        verifiedOnly: false,
        minPollResponses: 2,
        location: null,
        ageRange: null,
        gender: null,
        interests: '["health","mental health","wellness","public policy"]',
        rewardPerResponse: 5.00,
        totalBudget: 1000,
        slots: 200,
        filledSlots: 178,
        status: 'active',
        createdAt: new Date(now - 15 * day),
        closesAt: new Date(now + 2 * day),
      },
      {
        creatorId: createdUsers[4].id,
        title: 'Electric Vehicle Purchase Intent — 2026',
        description: 'Major automotive companies want to understand consumer readiness for EV adoption. Share your opinions on EV pricing, charging infrastructure, range anxiety, and brand preferences. Your feedback shapes the next generation of electric vehicles coming to market.',
        minScore: 250,
        verifiedOnly: false,
        minPollResponses: 5,
        location: 'Europe',
        ageRange: '25-55',
        gender: null,
        interests: '["automotive","electric vehicles","sustainability","technology"]',
        rewardPerResponse: 15.00,
        totalBudget: 2250,
        slots: 150,
        filledSlots: 37,
        status: 'active',
        createdAt: new Date(now - 2 * day),
        closesAt: new Date(now + 20 * day),
      },
      {
        creatorId: createdUsers[5].id,
        title: 'Streaming Service Satisfaction Survey',
        description: 'Tell us what you love (and hate) about your streaming services. We are comparing user satisfaction across Netflix, Disney+, HBO Max, Amazon Prime, and Apple TV+. Your ratings help streaming platforms improve their content and user experience.',
        minScore: 150,
        verifiedOnly: false,
        minPollResponses: 3,
        location: null,
        ageRange: '18-40',
        gender: null,
        interests: '["streaming","entertainment","TV","movies"]',
        rewardPerResponse: 6.50,
        totalBudget: 1300,
        slots: 200,
        filledSlots: 156,
        status: 'active',
        createdAt: new Date(now - 7 * day),
        closesAt: new Date(now + 3 * day),
      },
      {
        creatorId: createdUsers[6].id,
        title: 'Fashion Sustainability — Consumer Priorities',
        description: 'Are consumers willing to pay more for sustainable fashion? We need responses from fashion-conscious individuals about their purchasing habits, brand loyalty, and willingness to support eco-friendly clothing lines. Results will be shared with major fashion retailers.',
        minScore: 200,
        verifiedOnly: false,
        minPollResponses: 5,
        location: null,
        ageRange: '18-35',
        gender: 'female',
        interests: '["fashion","sustainability","clothing","eco-friendly"]',
        rewardPerResponse: 10.00,
        totalBudget: 800,
        slots: 80,
        filledSlots: 45,
        status: 'active',
        createdAt: new Date(now - 5 * day),
        closesAt: new Date(now + 12 * day),
      },
      {
        creatorId: createdUsers[7].id,
        title: 'Online Learning Effectiveness — Student Feedback',
        description: 'How effective are online learning platforms compared to traditional classrooms? Share your experiences with platforms like Coursera, Udemy, and edX. Your feedback helps educational institutions improve their digital learning offerings.',
        minScore: 100,
        verifiedOnly: false,
        minPollResponses: 2,
        location: null,
        ageRange: null,
        gender: null,
        interests: '["education","online learning","e-learning","students"]',
        rewardPerResponse: 4.00,
        totalBudget: 600,
        slots: 150,
        filledSlots: 120,
        status: 'active',
        createdAt: new Date(now - 20 * day),
        closesAt: new Date(now + 1 * day),
      },
      {
        creatorId: createdUsers[8].id,
        title: 'Food Delivery App Preferences & Pain Points',
        description: 'We are studying consumer behavior in food delivery apps (UberEats, DoorDash, Grubhub). Help us understand what drives your ordering decisions, what frustrates you, and what features you wish existed. Your input will directly influence app redesigns at major platforms.',
        minScore: 150,
        verifiedOnly: false,
        minPollResponses: 3,
        location: 'United States',
        ageRange: '18-45',
        gender: null,
        interests: '["food","delivery","apps","restaurants","convenience"]',
        rewardPerResponse: 7.50,
        totalBudget: 1125,
        slots: 150,
        filledSlots: 98,
        status: 'active',
        createdAt: new Date(now - 4 * day),
        closesAt: new Date(now + 8 * day),
      },
      {
        creatorId: createdUsers[9].id,
        title: 'Climate Change Awareness — Gen Z Perspectives',
        description: 'How concerned is Gen Z about climate change? We want to hear from young adults about their environmental concerns, sustainable practices, and expectations from governments and corporations. Your voice matters in shaping climate policy discussions.',
        minScore: 50,
        verifiedOnly: false,
        minPollResponses: 1,
        location: null,
        ageRange: '18-25',
        gender: null,
        interests: '["climate","environment","sustainability","activism"]',
        rewardPerResponse: 3.50,
        totalBudget: 525,
        slots: 150,
        filledSlots: 134,
        status: 'active',
        createdAt: new Date(now - 8 * day),
        closesAt: new Date(now + 6 * day),
      },
      {
        creatorId: createdUsers[10].id,
        title: 'Cryptocurrency & DeFi — Investor Sentiment',
        description: 'Major financial institutions want to understand retail investor sentiment toward cryptocurrency and decentralized finance. Share your investment strategies, risk tolerance, and opinions on regulation. Compensation is premium because we need experienced participants.',
        minScore: 700,
        verifiedOnly: true,
        minPollResponses: 15,
        location: null,
        ageRange: '25-55',
        gender: null,
        interests: '["finance","crypto","blockchain","investing","DeFi"]',
        rewardPerResponse: 35.00,
        totalBudget: 3500,
        slots: 100,
        filledSlots: 28,
        status: 'active',
        createdAt: new Date(now - 6 * hour),
        closesAt: new Date(now + 25 * day),
      },
      {
        creatorId: createdUsers[11].id,
        title: 'Sports Fan Engagement — Premier League & NBA',
        description: 'Help us understand what drives sports fan engagement in 2026. From social media interaction to live attendance, merchandise purchasing to fantasy leagues — share how you engage with your favorite sports. Results used by major sports networks and team franchises.',
        minScore: 200,
        verifiedOnly: false,
        minPollResponses: 5,
        location: null,
        ageRange: '18-50',
        gender: null,
        interests: '["sports","football","basketball","fan engagement","live events"]',
        rewardPerResponse: 9.00,
        totalBudget: 1800,
        slots: 200,
        filledSlots: 167,
        status: 'active',
        createdAt: new Date(now - 12 * day),
        closesAt: new Date(now + 4 * day),
      },
    ];

    const created = await db.paidPollListing.createMany({
      data: listings.map((l) => ({
        ...l,
        updatedAt: new Date(),
        opensAt: l.createdAt,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${created.count} marketplace listings with ${createdUsers.length} company users.`,
      total: created.count,
      users: createdUsers.length,
    });
  } catch (error) {
    console.error('POST /api/polls-marketplace/seed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed marketplace data' },
      { status: 500 }
    );
  }
}
