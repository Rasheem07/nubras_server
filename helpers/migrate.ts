import { execSync } from "child_process";

const applyMigrations = (databaseUrl: string) => {
  try {
    console.log(`Applying migrations to: ${databaseUrl}`);

    execSync(`DATABASE_URL="${databaseUrl}" npx prisma migrate deploy`, {
      stdio: "inherit",
    });

    console.log("Migrations applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
};
