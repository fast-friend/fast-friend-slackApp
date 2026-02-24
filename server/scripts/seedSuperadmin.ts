import mongoose from "mongoose";
import dotenv from "dotenv";
import AuthUser from "../src/modules/auth/models/authuser.model";
import { UserRole } from "../src/modules/auth/types/auth.types";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "";

async function seedOrganisation() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log("✓ Connected to MongoDB");

        // Check if user already exists
        const existingUser = await AuthUser.findOne({
            email: "amitsunda14374@gmail.com",
            role: UserRole.ORGANISATION,
        });

        if (existingUser) {
            console.log("⚠️  Organisation user already exists!");
            console.log("Email:", existingUser.email);
            console.log("Role:", existingUser.role);
            await mongoose.disconnect();
            return;
        }

        // Create organisation user
        const user = await AuthUser.create({
            email: "amitsunda14374@gmail.com",
            password: "12345678",
            role: UserRole.ORGANISATION,
        });

        console.log("\n✅ Organisation user created successfully!");
        console.log("Email:", user.email);
        console.log("Role:", user.role);
        console.log("User ID:", user._id);
        console.log("\nYou can now login with:");
        console.log("  Email: amitsunda14374@gmail.com");
        console.log("  Password: 12345678");

        await mongoose.disconnect();
        console.log("\n✓ Disconnected from MongoDB");
    } catch (error) {
        console.error("❌ Error seeding organisation:", error);
        process.exit(1);
    }
}

seedOrganisation();
