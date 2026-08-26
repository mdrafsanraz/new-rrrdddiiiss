"use client";

import { motion } from "motion/react";

export function PackageDemo() {
  return (
    <motion.main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">RDISTRO</p>
        <h1 className="text-3xl font-semibold tracking-tight">Packages ready</h1>
        <p className="max-w-xl text-muted-foreground">
          Motion is installed as{" "}
          <code className="font-mono text-sm">motion</code>. Import from{" "}
          <code className="font-mono text-sm">motion/react</code>.
        </p>
      </div>
    </motion.main>
  );
}
