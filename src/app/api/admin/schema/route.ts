import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DMMF } from '@prisma/client/runtime/library';

// Model metadata for the dashboard: icon, category, field definitions
const MODEL_META: Record<string, {
  icon: string;
  category: 'core' | 'social' | 'monetization' | 'live' | 'community';
  description: string;
  fields: Array<{ name: string; type: string; required: boolean; isUnique?: boolean; isId?: boolean; defaultVal?: string }>;
}> = {
  User: {
    icon: 'User',
    category: 'core',
    description: 'Core user account with profile, wallet, and score',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'username', type: 'String', required: true, isUnique: true },
      { name: 'email', type: 'String', required: true, isUnique: true },
      { name: 'passwordHash', type: 'String', required: true },
      { name: 'displayName', type: 'String', required: false },
      { name: 'bio', type: 'String', required: false },
      { name: 'avatarUrl', type: 'String', required: false },
      { name: 'role', type: 'String', required: true, defaultVal: '"member"' },
      { name: 'memberScore', type: 'Int', required: true, defaultVal: '0' },
      { name: 'walletBalance', type: 'Float', required: true, defaultVal: '0.0' },
      { name: 'isVerified', type: 'Boolean', required: true, defaultVal: 'false' },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
      { name: 'updatedAt', type: 'DateTime', required: true, defaultVal: 'updatedAt' },
    ],
  },
  Video: {
    icon: 'Video',
    category: 'core',
    description: 'Lead clips and response videos with tags and categories',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'creatorId', type: 'String', required: true },
      { name: 'type', type: 'String', required: true, defaultVal: '"lead"' },
      { name: 'title', type: 'String', required: true },
      { name: 'description', type: 'String', required: false },
      { name: 'videoUrl', type: 'String', required: true },
      { name: 'thumbnailUrl', type: 'String', required: false },
      { name: 'category', type: 'String', required: false },
      { name: 'tags', type: 'String', required: false },
      { name: 'status', type: 'String', required: true, defaultVal: '"active"' },
      { name: 'duration', type: 'Int', required: false },
      { name: 'viewCount', type: 'Int', required: true, defaultVal: '0' },
      { name: 'isPublic', type: 'Boolean', required: true, defaultVal: 'true' },
      { name: 'parentVideoId', type: 'String', required: false },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
      { name: 'updatedAt', type: 'DateTime', required: true, defaultVal: 'updatedAt' },
    ],
  },
  Poll: {
    icon: 'BarChart3',
    category: 'core',
    description: 'Polls attached to videos with targeting and rewards',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'videoId', type: 'String', required: true },
      { name: 'question', type: 'String', required: true },
      { name: 'options', type: 'String', required: true },
      { name: 'targetingCriteria', type: 'String', required: false },
      { name: 'isPaid', type: 'Boolean', required: true, defaultVal: 'false' },
      { name: 'rewardPerResponse', type: 'Float', required: false },
      { name: 'totalRewardPool', type: 'Float', required: false },
      { name: 'maxResponses', type: 'Int', required: false },
      { name: 'responseCount', type: 'Int', required: true, defaultVal: '0' },
      { name: 'closesAt', type: 'DateTime', required: false },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
      { name: 'updatedAt', type: 'DateTime', required: true, defaultVal: 'updatedAt' },
    ],
  },
  PollVote: {
    icon: 'Vote',
    category: 'core',
    description: 'Individual poll votes with one-vote-per-user constraint',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'pollId', type: 'String', required: true },
      { name: 'userId', type: 'String', required: true },
      { name: 'optionId', type: 'String', required: true },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
    ],
  },
  Follow: {
    icon: 'UserPlus',
    category: 'social',
    description: 'User follow relationships with unique constraint',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'followerId', type: 'String', required: true },
      { name: 'followingId', type: 'String', required: true },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
    ],
  },
  Comment: {
    icon: 'MessageSquare',
    category: 'social',
    description: 'Video comments with nested replies and video replies',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'userId', type: 'String', required: true },
      { name: 'videoId', type: 'String', required: true },
      { name: 'content', type: 'String', required: true },
      { name: 'parentCommentId', type: 'String', required: false },
      { name: 'isVideoReply', type: 'Boolean', required: true, defaultVal: 'false' },
      { name: 'videoReplyUrl', type: 'String', required: false },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
      { name: 'updatedAt', type: 'DateTime', required: true, defaultVal: 'updatedAt' },
    ],
  },
  CommentLike: {
    icon: 'Heart',
    category: 'social',
    description: 'Likes on comments with unique constraint',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'commentId', type: 'String', required: true },
      { name: 'userId', type: 'String', required: true },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
    ],
  },
  Like: {
    icon: 'ThumbsUp',
    category: 'social',
    description: 'Video likes with unique per-user constraint',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'userId', type: 'String', required: true },
      { name: 'videoId', type: 'String', required: true },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
    ],
  },
  Transaction: {
    icon: 'CreditCard',
    category: 'monetization',
    description: 'Wallet transactions: tips, withdrawals, deposits, rewards',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'userId', type: 'String', required: true },
      { name: 'amount', type: 'Float', required: true },
      { name: 'type', type: 'String', required: true },
      { name: 'status', type: 'String', required: true, defaultVal: '"pending"' },
      { name: 'description', type: 'String', required: false },
      { name: 'referenceId', type: 'String', required: false },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
    ],
  },
  Invitation: {
    icon: 'Send',
    category: 'social',
    description: 'Video invitations with reward tracking',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'inviterId', type: 'String', required: true },
      { name: 'inviteeEmail', type: 'String', required: true },
      { name: 'videoId', type: 'String', required: false },
      { name: 'status', type: 'String', required: true, defaultVal: '"sent"' },
      { name: 'rewardGiven', type: 'Boolean', required: true, defaultVal: 'false' },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
      { name: 'respondedAt', type: 'DateTime', required: false },
    ],
  },
  Circle: {
    icon: 'Circle',
    category: 'community',
    description: 'Community circles for content sharing',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'name', type: 'String', required: true },
      { name: 'description', type: 'String', required: false },
      { name: 'coverUrl', type: 'String', required: false },
      { name: 'creatorId', type: 'String', required: true },
      { name: 'isPublic', type: 'Boolean', required: true, defaultVal: 'true' },
      { name: 'memberCount', type: 'Int', required: true, defaultVal: '0' },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
      { name: 'updatedAt', type: 'DateTime', required: true, defaultVal: 'updatedAt' },
    ],
  },
  CircleMember: {
    icon: 'Users',
    category: 'community',
    description: 'Circle memberships with roles: member, moderator, admin',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'circleId', type: 'String', required: true },
      { name: 'userId', type: 'String', required: true },
      { name: 'role', type: 'String', required: true, defaultVal: '"member"' },
      { name: 'joinedAt', type: 'DateTime', required: true, defaultVal: 'now()' },
    ],
  },
  CircleVideo: {
    icon: 'Share2',
    category: 'community',
    description: 'Videos shared within circles',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'circleId', type: 'String', required: true },
      { name: 'videoId', type: 'String', required: true },
      { name: 'sharedBy', type: 'String', required: true },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
    ],
  },
  LiveSession: {
    icon: 'Radio',
    category: 'live',
    description: 'Live streaming sessions with viewer tracking',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'creatorId', type: 'String', required: true },
      { name: 'title', type: 'String', required: true },
      { name: 'description', type: 'String', required: false },
      { name: 'status', type: 'String', required: true, defaultVal: '"scheduled"' },
      { name: 'startedAt', type: 'DateTime', required: false },
      { name: 'endedAt', type: 'DateTime', required: false },
      { name: 'viewerCount', type: 'Int', required: true, defaultVal: '0' },
      { name: 'peakViewers', type: 'Int', required: true, defaultVal: '0' },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
      { name: 'updatedAt', type: 'DateTime', required: true, defaultVal: 'updatedAt' },
    ],
  },
  LivePoll: {
    icon: 'BarChart2',
    category: 'live',
    description: 'Real-time polls during live sessions',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'sessionId', type: 'String', required: true },
      { name: 'question', type: 'String', required: true },
      { name: 'options', type: 'String', required: true },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
    ],
  },
  Report: {
    icon: 'Flag',
    category: 'social',
    description: 'Content reports with jury voting system',
    fields: [
      { name: 'id', type: 'String', required: true, isId: true, defaultVal: 'cuid()' },
      { name: 'reporterId', type: 'String', required: true },
      { name: 'videoId', type: 'String', required: false },
      { name: 'commentId', type: 'String', required: false },
      { name: 'reason', type: 'String', required: true },
      { name: 'description', type: 'String', required: false },
      { name: 'status', type: 'String', required: true, defaultVal: '"pending"' },
      { name: 'juryVotes', type: 'String', required: false },
      { name: 'createdAt', type: 'DateTime', required: true, defaultVal: 'now()' },
      { name: 'resolvedAt', type: 'DateTime', required: false },
    ],
  },
};

export async function GET() {
  try {
    // Get record counts for each model
    const modelNames = Object.keys(MODEL_META);
    const counts: Record<string, number> = {};

    // We use raw query to count each model
    for (const modelName of modelNames) {
      try {
        const result = await (db as unknown as Record<string, { count: () => Promise<number> }>)[modelName].count();
        counts[modelName] = typeof result === 'number' ? result : 0;
      } catch {
        counts[modelName] = 0;
      }
    }

    // Get the actual DMMF schema from Prisma
    const { Prisma } = await import('@prisma/client');
    const dmmf: DMMF.Document = (Prisma as unknown as { dmmf: DMMF.Document }).dmmf;

    // Build model schema definitions from DMMF
    const schemaDefinitions: Record<string, unknown> = {};
    for (const model of dmmf.datamodel.models) {
      schemaDefinitions[model.name] = {
        fields: model.fields.map((f) => ({
          name: f.name,
          kind: f.kind,
          type: f.type,
          isRequired: f.isRequired,
          isList: f.isList,
          isUnique: f.isUnique,
          isId: f.isId,
          hasDefaultValue: f.hasDefaultValue,
          default: f.default,
          relationName: f.relationName,
        })),
      };
    }

    // Calculate summary stats
    const totalModels = modelNames.length;
    const totalFields = modelNames.reduce(
      (sum, name) => sum + (MODEL_META[name]?.fields.length || 0),
      0
    );
    const totalRecords = Object.values(counts).reduce((sum, c) => sum + c, 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalModels,
          totalFields,
          totalRecords,
          categories: {
            core: modelNames.filter((n) => MODEL_META[n]?.category === 'core'),
            social: modelNames.filter((n) => MODEL_META[n]?.category === 'social'),
            monetization: modelNames.filter((n) => MODEL_META[n]?.category === 'monetization'),
            community: modelNames.filter((n) => MODEL_META[n]?.category === 'community'),
            live: modelNames.filter((n) => MODEL_META[n]?.category === 'live'),
          },
        },
        models: modelNames.map((name) => ({
          name,
          ...MODEL_META[name],
          recordCount: counts[name] ?? 0,
          schema: schemaDefinitions[name],
        })),
      },
    });
  } catch (error) {
    console.error('Schema API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch schema information',
      },
      { status: 500 }
    );
  }
}
