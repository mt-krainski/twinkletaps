import { prisma } from "../prisma";

export type ProfileData = {
  fullName: string | null;
  username: string | null;
  website: string | null;
  avatarUrl: string | null;
};

export async function getProfile(userId: string) {
  return prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      username: true,
      website: true,
      avatarUrl: true,
      updatedAt: true,
    },
  });
}

export async function getProfileSummary(userId: string) {
  return prisma.profile.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      avatarUrl: true,
    },
  });
}

export async function updateProfile(
  userId: string,
  data: Partial<ProfileData>
) {
  return prisma.profile.update({
    where: { id: userId },
    data: {
      fullName: data.fullName,
      username: data.username,
      website: data.website,
      avatarUrl: data.avatarUrl,
    },
  });
}

