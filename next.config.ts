import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les tests E2E buildent dans .next-e2e pour ne pas écraser le .next du serveur de dev
  distDir: process.env.NEXT_DIST_DIR || ".next",
  logging: {
    // En dev, Next affiche chaque appel de Server Action avec ses arguments — y compris le mot de
    // passe en clair de signInAction / signUpAction (visible dans le terminal, les captures et les
    // partages d'écran). Désactivé : les requêtes HTTP restent journalisées.
    serverFunctions: false,
  },
};

export default nextConfig;
