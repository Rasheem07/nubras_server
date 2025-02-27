import { prisma } from "src/lib/prisma";

const activeUsers = new Map<string, NodeJS.Timeout>();

export const trackUserActivity = async (userId: string) => {
    // Clear previous timeout if the user is active again
    if (activeUsers.has(userId)) {
        clearTimeout(activeUsers.get(userId)!);
    }

    // Set a timeout to mark the user as offline after 5 minutes
    activeUsers.set(
        userId,
        setTimeout(async () => {
            await prisma.user.update({
                where: { id: userId },
                data: { status: "Offline" },
            });
            activeUsers.delete(userId);
        }, 5 * 60 * 1000) // 5 minutes
    );
};
